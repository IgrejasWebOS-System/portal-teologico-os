"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X, ShoppingCart } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import { useCarrinho } from "@/utils/useCarrinho";
import { contarItensCarrinho } from "@/utils/carrinho";
import FloatingSocialIcons from "./FloatingSocialIcons";
import LocaleSwitcher from "./LocaleSwitcher";

// ============================================================
// PublicHeader — cabeçalho institucional do CETADP
// Usado nas páginas públicas (home, inscrição, sobre).
// Verifica sessão no client apenas para alternar o CTA
// (Entrar × Meu Portal) — a proteção real das rotas continua
// no middleware (server-side).
// ============================================================

interface NavItem {
  href: string;
  key: "cursos" | "reciclagem" | "teologia" | "biblioteca" | "loja" | "sobre";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/#cursos", key: "cursos" },
  { href: "/#reciclagem", key: "reciclagem" },
  { href: "/#teologia", key: "teologia" },
  { href: "/biblioteca", key: "biblioteca" },
  { href: "/loja", key: "loja" },
  { href: "/sobre", key: "sobre" },
];

export default function PublicHeader() {
  const t = useTranslations("common.header");
  const [user, setUser] = useState<User | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const { itens } = useCarrinho();
  const totalItensCarrinho = contarItensCarrinho(itens);
  const pathname = usePathname();
  // O ícone/link do carrinho só faz sentido dentro da Loja — a home e
  // as demais páginas institucionais não devem exibi-lo.
  const emPaginaDaLoja = pathname?.startsWith("/loja");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <FloatingSocialIcons />
      <header className="sticky top-0 w-full z-50 shadow-sm">
      {/* ── Barra de utilidade ── */}
      <div className="bg-iw-navy hidden md:block w-full">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <span className="text-white text-base font-semibold">
            {t("barraTopo")}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-iw-gold text-lg font-semibold">
              {t("slogan")}
            </span>
            <LocaleSwitcher variant="escuro" className="border-l border-white/20 pl-4" />
          </div>
        </div>
      </div>

      {/* ── Identidade + CTAs ── */}
      <div className="bg-iw-surface border-b border-iw-border w-full">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none group">
            <Logo size="md" variant="dark" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] text-iw-muted font-semibold uppercase tracking-widest hidden sm:block">
                {t("identidadeLabel")}
              </span>
              <span className="text-iw-navy font-extrabold text-xl tracking-tight group-hover:text-iw-gold transition-colors">
                CETADP
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            <p className="hidden lg:block text-iw-muted text-sm italic leading-snug text-right max-w-xs">
              {t("versiculoTexto")}
            </p>
            {user ? (
              <Link
                href="/portal"
                className="bg-iw-blue text-iw-navy hover:bg-iw-navy hover:text-white font-semibold text-xs px-4 py-2 rounded-md transition-all"
              >
                {t("meuPortal")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="border border-iw-navy/30 text-iw-navy hover:bg-iw-navy hover:text-white font-semibold text-xs px-4 py-2 rounded-md transition-all"
                >
                  {t("entrar")}
                </Link>
                <Link
                  href="/inscricao"
                  className="bg-[#E88D0C] hover:opacity-90 text-white font-semibold text-xs px-4 py-2 rounded-md transition-all border border-black"
                >
                  {t("inscrevaSe")}
                </Link>
              </>
            )}
            {emPaginaDaLoja && (
              <Link
                href="/loja/carrinho"
                className="relative p-2 rounded-md text-iw-navy hover:bg-iw-bg transition-colors"
                aria-label={t("carrinho")}
              >
                <ShoppingCart className="w-[18px] h-[18px]" />
                {totalItensCarrinho > 0 && (
                  <span className="absolute -top-1 -right-1 bg-iw-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItensCarrinho}
                  </span>
                )}
              </Link>
            )}
          </div>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden w-9 h-9 rounded-lg bg-black border-2 border-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity"
            aria-label={t("abrirMenu")}
          >
            {menuAberto ? <X className="w-5 h-5 text-[#E88D0C]" /> : <Menu className="w-5 h-5 text-[#E88D0C]" />}
          </button>
        </div>
      </div>

      {/* ── Navegação institucional ── */}
      <div className="bg-iw-navy hidden md:block border-t-2 border-b-2 border-iw-gold/40 w-full">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-white/80 hover:text-iw-gold font-semibold text-sm transition-colors"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Menu mobile ── */}
      {menuAberto && (
        <div className="md:hidden bg-iw-surface border-b border-iw-border shadow-lg">
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                className="px-2 py-2 text-sm font-medium text-iw-navy hover:bg-iw-bg rounded-md transition-colors"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            <div className="border-t border-iw-border my-2" />
            <div className="flex justify-center pb-2">
              <LocaleSwitcher variant="claro" />
            </div>
            <div className="flex flex-col gap-2">
              {user ? (
                <Link
                  href="/portal"
                  onClick={() => setMenuAberto(false)}
                  className="w-full text-center bg-iw-blue text-iw-navy font-bold py-2.5 rounded-md text-sm"
                >
                  {t("meuPortal")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuAberto(false)}
                    className="w-full text-center border border-iw-navy/30 text-iw-navy font-bold py-2.5 rounded-md text-sm"
                  >
                    {t("entrar")}
                  </Link>
                  <Link
                    href="/inscricao"
                    onClick={() => setMenuAberto(false)}
                    className="w-full text-center bg-[#E88D0C] text-white font-bold py-2.5 rounded-md text-sm border border-black"
                  >
                    {t("inscrevaSe")}
                  </Link>
                </>
              )}
              {emPaginaDaLoja && (
                <Link
                  href="/loja/carrinho"
                  onClick={() => setMenuAberto(false)}
                  className="w-full text-center border border-iw-navy/30 text-iw-navy font-bold py-2.5 rounded-md text-sm flex items-center justify-center gap-2"
                >
                  {t("carrinho")}
                  {totalItensCarrinho > 0 && (
                    <span className="bg-iw-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {totalItensCarrinho}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      </header>
    </>
  );
}
