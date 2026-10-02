"use client";

import type { ComponentType } from "react";
import { useLocale } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

// ============================================================
// LocaleSwitcher — troca entre pt-BR/en-US/es-419 mantendo a
// página atual (usePathname já vem sem o prefixo de idioma;
// getPathname({ href: pathname, locale }) recalcula o prefixo certo).
//
// Por que navegação "dura" (window.location.href) e não
// router.replace(): bug real encontrado em 12/09/2026 — o Router
// Cache do App Router do Next colide com o prefetch automático do
// link "Entrar/Log In" do header (que fica visível na dobra
// superior, então o Next pré-busca ele sozinho ao entrar em
// viewport). Resultado: clicar em "Português" vindo de /es-419
// navegava para /login em vez de "/", mesmo com o `pathname` lido
// corretamente como "/" (confirmado com log). Forçar
// window.location.href pula o Router Cache inteiro e sempre acerta
// o destino — como troca de locale já obriga recarregar a página
// mesmo (idioma é parte do layout raiz), não há perda de
// performance real. Ver staging/governance/ERROS-COMUNS-IA.md.
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

// Bandeira em SVG inline (não emoji) representando cada idioma — pt-BR e
// en-US mapeiam direto pro país; es-419 (Espanhol Latino-americano) usa a
// bandeira da Espanha por ser a convenção padrão de seletor de idioma
// quando não há uma bandeira "regional" única pra representar todo o
// espanhol latino-americano.
//
// Por que SVG e não emoji: bandeira emoji (🇧🇷 etc.) depende da fonte do
// sistema operacional ter os glifos de "regional indicator symbol". O
// Windows historicamente NÃO tem esses glifos — o Chrome no Windows caía
// pra mostrar as duas letras do código do país ("BR", "US", "ES") ou nada,
// em vez da bandeira de verdade (confirmado em teste real). SVG desenhado
// à mão renderiza igual em qualquer sistema operacional, sem depender de
// fonte nenhuma.
function BandeiraBR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#009c3b" />
      <polygon points="12,2.5 22,8 12,13.5 2,8" fill="#ffdf00" />
      <circle cx="12" cy="8" r="4" fill="#002776" />
    </svg>
  );
}

function BandeiraUS({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#ffffff" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * (16 / 13)} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10" height={16 * (7 / 13)} fill="#3c3b6e" />
    </svg>
  );
}

function BandeiraES({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#aa151b" />
      <rect y="4" width="24" height="8" fill="#f1bf00" />
    </svg>
  );
}

const BANDEIRA_IDIOMA: Record<AppLocale, ComponentType<{ className?: string }>> = {
  "pt-BR": BandeiraBR,
  "en-US": BandeiraUS,
  "es-419": BandeiraES,
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

  // Sem texto agora (era "PT · EN · ES"), então o estado ativo/inativo é
  // marcado por opacidade + anel, não mais por cor de texto.
  const corAtivo = variant === "escuro" ? "ring-iw-gold opacity-100" : "ring-iw-navy opacity-100";
  const corInativo = "ring-transparent opacity-60 hover:opacity-100";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {routing.locales.map((locale) => {
        const Bandeira = BANDEIRA_IDIOMA[locale];
        return (
          <button
            key={locale}
            type="button"
            onClick={() => {
              window.location.href = getPathname({ href: pathname, locale });
            }}
            title={NOMES_IDIOMA[locale]}
            aria-label={NOMES_IDIOMA[locale]}
            aria-current={locale === localeAtivo ? "true" : undefined}
            className={`block rounded-[3px] ring-2 ring-offset-1 ring-offset-transparent transition-all ${
              locale === localeAtivo ? corAtivo : corInativo
            }`}
          >
            <Bandeira className="w-5 h-3.5 rounded-[2px] block" />
          </button>
        );
      })}
    </div>
  );
}
