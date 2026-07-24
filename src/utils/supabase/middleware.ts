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

  return supabaseResponse;
}
