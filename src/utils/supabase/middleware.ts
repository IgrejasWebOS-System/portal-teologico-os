import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Usuário logado tentando acessar /login → redireciona para o hub do portal
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
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
