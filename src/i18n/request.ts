import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Namespaces carregados por módulo — começa só com "common" na Fase 0.
// Cada novo módulo (auth, home, academy, financeiro...) entra nesta
// lista quando a Fase 1/2 traduzir aquele módulo. Manter separado por
// namespace evita carregar um dicionário gigante numa página simples.
const NAMESPACES = ["common"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`../../messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    })
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
