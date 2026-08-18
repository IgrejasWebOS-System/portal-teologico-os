"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

// ============================================================
// LocaleSwitcher — troca entre pt-BR/en-US/es-419 mantendo a
// página atual (usePathname já vem sem o prefixo de idioma;
// router.replace(pathname, { locale }) recalcula o prefixo certo).
//
// Nomes de idioma ficam sempre no próprio idioma ("English", não
// "Inglês") — convenção padrão de seletor de idioma, pra alguém
// que não lê o idioma atual ainda achar o dele.
//
// `variant`:
// - "escuro" (padrão): texto claro sobre fundo navy (barra superior
//   do header, rodapé)
// - "claro": texto escuro sobre fundo claro (menu mobile)
// ============================================================

const NOMES_IDIOMA: Record<AppLocale, string> = {
  "pt-BR": "Português",
  "en-US": "English",
  "es-419": "Español",
};

const SIGLAS_IDIOMA: Record<AppLocale, string> = {
  "pt-BR": "PT",
  "en-US": "EN",
  "es-419": "ES",
};

export default function LocaleSwitcher({
  variant = "escuro",
  className = "",
}: {
  variant?: "escuro" | "claro";
  className?: string;
}) {
  const localeAtivo = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const corInativo = variant === "escuro" ? "text-white/50 hover:text-white" : "text-iw-muted hover:text-iw-navy";
  const corAtivo = variant === "escuro" ? "text-iw-gold" : "text-iw-navy";
  const corSeparador = variant === "escuro" ? "text-white/30" : "text-iw-border";

  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${className}`}>
      {routing.locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1.5">
          {i > 0 && <span className={corSeparador}>·</span>}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale })}
            title={NOMES_IDIOMA[locale]}
            aria-current={locale === localeAtivo ? "true" : undefined}
            className={`transition-colors ${locale === localeAtivo ? corAtivo : corInativo}`}
          >
            {SIGLAS_IDIOMA[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
