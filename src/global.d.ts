import type { routing } from "@/i18n/routing";
import type ptBRCommon from "../messages/pt-BR/common.json";

// Tipagem forte das chaves de tradução: usar uma chave que não existe
// (ou esquecer uma) vira erro de "npx tsc --noEmit", não texto quebrado
// em produção. "pt-BR" é a referência — todo outro idioma precisa ter
// exatamente as mesmas chaves.
type Messages = {
  common: typeof ptBRCommon;
};

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
