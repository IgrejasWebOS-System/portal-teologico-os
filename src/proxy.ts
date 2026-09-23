import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/utils/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);

// Rotas que NÃO vivem dentro de src/app/[locale]/... — /api/* e
// /auth/* são pastas de nível raiz (route handlers), sem página
// localizada. O middleware do next-intl reescreve toda URL sem
// prefixo para incluir o locale (ex.: "/auth/callback" ->
// "/pt-BR/auth/callback") pra bater com a pasta [locale]; como essas
// duas pastas não existem dentro de [locale], essa reescrita faz o
// Next.js devolver 404 — bug real, confirmado em produção em
// 19/09/2026 (quebrava /auth/callback e /api/webhooks/mercadopago).
// Por isso pulamos o next-intl pra essas rotas, mas ainda passamos
// pelo updateSession() normalmente (refresh de sessão / cookies do
// Supabase continuam funcionando igual).
function precisaPularIntl(pathname: string): boolean {
  return pathname.startsWith("/api") || pathname.startsWith("/auth");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Idioma primeiro: resolve o prefixo (/en-US, /es-419) e o
  //    cookie NEXT_LOCALE. Em "as-needed", pt-BR (padrão) continua
  //    sem prefixo — nenhuma URL atual muda. Pulado para /api e
  //    /auth (ver comentário de precisaPularIntl acima).
  const intlResponse = precisaPularIntl(pathname)
    ? NextResponse.next({ request })
    : handleI18nRouting(request);

  // 2) Sessão/autenticação do Supabase por cima da resposta que o
  //    next-intl já preparou, preservando os cookies/headers de
  //    idioma (ver updateSession em utils/supabase/middleware.ts).
  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
