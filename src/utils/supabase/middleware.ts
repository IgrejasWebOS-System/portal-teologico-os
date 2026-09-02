import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkIsStaff } from "@/utils/staff";
import { routing } from "@/i18n/routing";

// Rotas acessíveis sem autenticação (prefixo)
const PUBLIC_PATHS = [
  "/login",
  "/recuperar-senha",
  "/cadastro",
  "/inscricao",
  "/sobre",
  "/certificados",
  "/biblioteca",
  "/auth/callback",
  "/loja",
  "/matricula/pagamento",
  "/api/webhooks/mercadopago",
  "/confirmar-cadastro",
];
// Rotas públicas de correspondência exata (evita casar "/" com tudo)
const PUBLIC_EXACT = ["/"];

// pt-BR não tem prefixo na URL; en-US e es-419 têm (/en-US/login).
// Todo o roteamento de auth abaixo trabalha com o caminho SEM prefixo
// (equivalente ao pt-BR), e devolve o prefixo de volta nos redirects
// pra não trocar o idioma da pessoa no meio do fluxo de login.
function semPrefixoDeIdioma(pathname: string): {
  locale: string;
  path: string;
} {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return { locale, path: pathname.slice(locale.length + 1) || "/" };
    }
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function comPrefixoDeIdioma(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

export async function updateSession(
  request: NextRequest,
  baseResponse?: NextResponse
) {
  // Quando vem de proxy.ts, baseResponse já é a resposta que o
  // next-intl preparou (prefixo/cookie de idioma) — a sessão do
  // Supabase continua a partir dela em vez de descartá-la, senão o
  // idioma resolvido pelo next-intl se perde nas rotas autenticadas.
  let supabaseResponse = baseResponse ?? NextResponse.next({ request });
  const { locale, path } = semPrefixoDeIdioma(request.nextUrl.pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Preserva os cookies que já estavam na resposta anterior
          // (ex.: NEXT_LOCALE do next-intl) antes de recriar a
          // resposta para aplicar os cookies novos de sessão.
          const previousCookies = supabaseResponse.cookies.getAll();
          supabaseResponse = NextResponse.next({ request });
          previousCookies.forEach((cookie) =>
            supabaseResponse.cookies.set(cookie)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // OBRIGATÓRIO: getUser() valida o token com o servidor (nunca getSession())
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic =
    PUBLIC_EXACT.includes(path) || PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Usuário logado tentando acessar /login → redireciona para o destino certo.
  // Staff (secretaria/admin) sempre cai em /admin, nunca no hub do aluno —
  // mesmo critério já usado em loginAction, mas este cobre quem já tinha
  // sessão ativa e só reabriu /login (o loginAction só roda no submit).
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    const isStaff = await checkIsStaff(supabase, user.id);
    url.pathname = comPrefixoDeIdioma(locale, isStaff ? "/admin" : "/portal");
    return NextResponse.redirect(url);
  }

  // Usuário não autenticado em rota protegida → redireciona para /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = comPrefixoDeIdioma(locale, "/login");
    return NextResponse.redirect(url);
  }

  // Usuário recém-convidado (M9 — inviteStaffAction) precisa trocar a
  // senha temporária antes de acessar qualquer outra rota protegida.
  if (user && !isPublic && path !== "/trocar-senha") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .single();

    if (profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = comPrefixoDeIdioma(locale, "/trocar-senha");
      return NextResponse.redirect(url);
    }
  }

  // Gate mobile PROVAS/PORTAL — piloto restrito a quem tem
  // profiles.pode_escanear_provas = true, só quando acessa por
  // dispositivo mobile e ainda não escolheu nesta sessão (cookie
  // "modo_acesso"). Quem não tem a flag, ou acessa pelo desktop,
  // nunca vê essa tela — segue reto para onde já ia.
  if (
    user &&
    !isPublic &&
    path !== "/trocar-senha" &&
    path !== "/escolher-modo" &&
    !path.startsWith("/provas")
  ) {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
      request.headers.get("user-agent") ?? ""
    );
    const jaEscolheu = request.cookies.get("modo_acesso");

    if (isMobile && !jaEscolheu) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pode_escanear_provas")
        .eq("id", user.id)
        .single();

      if (profile?.pode_escanear_provas) {
        const url = request.nextUrl.clone();
        url.pathname = comPrefixoDeIdioma(locale, "/escolher-modo");
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
