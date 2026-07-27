import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkIsStaff } from "@/utils/staff";

// Rotas acessíveis sem autenticação (prefixo)
const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/inscricao",
  "/sobre",
  "/certificados",
  "/biblioteca",
  "/auth/callback",
  "/loja",
  "/matricula/pagamento",
  "/api/webhooks/mercadopago",
];
// Rotas públicas de correspondência exata (evita casar "/" com tudo)
const PUBLIC_EXACT = ["/"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

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
          supabaseResponse = NextResponse.next({ request });
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
    url.pathname = isStaff ? "/admin" : "/portal";
    return NextResponse.redirect(url);
  }

  // Usuário não autenticado em rota protegida → redireciona para /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
      url.pathname = "/trocar-senha";
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
        url.pathname = "/escolher-modo";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
