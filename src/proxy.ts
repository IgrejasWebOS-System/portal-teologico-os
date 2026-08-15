import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/utils/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1) Idioma primeiro: resolve o prefixo (/en-US, /es-419) e o
  //    cookie NEXT_LOCALE. Em "as-needed", pt-BR (padrão) continua
  //    sem prefixo — nenhuma URL atual muda.
  const intlResponse = handleI18nRouting(request);

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
