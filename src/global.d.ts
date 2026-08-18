import type { routing } from "@/i18n/routing";
import type ptBRCommon from "../messages/pt-BR/common.json";
import type ptBRHome from "../messages/pt-BR/home.json";
import type ptBRAuth from "../messages/pt-BR/auth.json";
import type ptBRSobre from "../messages/pt-BR/sobre.json";
import type ptBRInscricao from "../messages/pt-BR/inscricao.json";
import type ptBRLoja from "../messages/pt-BR/loja.json";

// Tipagem forte das chaves de tradução: usar uma chave que não existe
// (ou esquecer uma) vira erro de "npx tsc --noEmit", não texto quebrado
// em produção. "pt-BR" é a referência — todo outro idioma precisa ter
// exatamente as mesmas chaves.
type Messages = {
  common: typeof ptBRCommon;
  home: typeof ptBRHome;
  auth: typeof ptBRAuth;
  sobre: typeof ptBRSobre;
  inscricao: typeof ptBRInscricao;
  loja: typeof ptBRLoja;
};

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
