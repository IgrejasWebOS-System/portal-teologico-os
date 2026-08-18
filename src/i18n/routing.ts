import { defineRouting } from "next-intl/routing";

// pt-BR é o idioma padrão e NÃO ganha prefixo na URL ("as-needed") —
// isso preserva 100% das URLs atuais (/login continua /login). Só
// en-US e es-419 ganham prefixo (/en-US/login, /es-419/login).
//
// localeDetection: false — desliga a negociação automática por cookie
// NEXT_LOCALE / cabeçalho Accept-Language. Sem isso, visitar /en-US ou
// /es-419 grava um cookie que passa a "vazar" pro endereço sem prefixo
// (/ e /login), fazendo pt-BR sumir depois da primeira visita a outro
// idioma. Com isso desligado, a URL sem prefixo é SEMPRE pt-BR — só um
// seletor de idioma explícito (Fase 1, dia 4) deve trocar o idioma.
export const routing = defineRouting({
  locales: ["pt-BR", "en-US", "es-419"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
