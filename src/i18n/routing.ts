import { defineRouting } from "next-intl/routing";

// pt-BR é o idioma padrão e NÃO ganha prefixo na URL ("as-needed") —
// isso preserva 100% das URLs atuais (/login continua /login). Só
// en-US e es-419 ganham prefixo (/en-US/login, /es-419/login).
export const routing = defineRouting({
  locales: ["pt-BR", "en-US", "es-419"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
