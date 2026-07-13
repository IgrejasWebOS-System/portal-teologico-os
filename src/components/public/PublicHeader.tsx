"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, BadgeCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";

// ============================================================
// PublicHeader — cabeçalho institucional do CETADP
// Usado nas páginas públicas (home, inscrição, sobre).
// Verifica sessão no client apenas para alternar o CTA
// (Entrar × Meu Portal) — a proteção real das rotas continua
// no middleware (server-side).
// ============================================================

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/#cursos", label: "Cursos Oficiais" },
  { href: "/#reciclagem", label: "Reciclagem" },
  { href: "/#teologia", label: "Teologia (níveis)" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/sobre", label: "Quem Somos" },
];

export default function PublicHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 w-full z-50 shadow-sm">
      {/* ── Barra de utilidade ── */}
      <div className="bg-iw-navy hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <span className="text-white text-sm font-semibold">
            CETADP · Assembleia de Deus · Piracicaba-SP
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/certificados"
              className="text-white hover:text-iw-gold text-sm font-semibold transition-colors inline-flex items-center gap-1"
            >
              <BadgeCheck className="w-3 h-3" />
              Validar Certificado
            </Link>
          </div>
        </div>
      </div>

      {/* ── Identidade + CTAs ── */}
      <div className="bg-iw-surface border-b border-iw-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none group">
            <Logo size="md" variant="dark" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] text-iw-muted font-semibold uppercase tracking-widest hidden sm:block">
                Centro Educacional Teológico
              </span>
              <span className="text-iw-navy font-extrabold text-xl tracking-tight group-hover:text-iw-gold transition-colors">
                CETADP
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link
                href="/portal"
                className="bg-iw-blue text-iw-navy hover:bg-iw-navy hover:text-white font-semibold text-xs px-4 py-2 rounded-md transition-all"
              >
                Meu Portal
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="border border-iw-navy/30 text-iw-navy hover:bg-iw-navy hover:text-white font-semibold text-xs px-4 py-2 rounded-md transition-all"
                >
                  Fazer Login
                </Link>
                <Link
                  href="/inscricao"
                  className="bg-iw-gold hover:opacity-90 text-white font-semibold text-xs px-4 py-2 rounded-md transition-all"
                >
                  Inscreva-se
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden p-2 rounded-md text-iw-navy hover:bg-iw-bg transition-colors"
            aria-label="Abrir menu"
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Navegação institucional ── */}
      <div className="bg-iw-navy hidden md:block border-t-2 border-b-2 border-iw-gold/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-white/80 hover:text-iw-gold font-semibold text-sm transition-colors"
            >
              {item.label}
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
                {item.label}
              </Link>
            ))}
            <div className="border-t border-iw-border my-2" />
            <div className="flex flex-col gap-2">
              {user ? (
                <Link
                  href="/portal"
                  onClick={() => setMenuAberto(false)}
                  className="w-full text-center bg-iw-blue text-iw-navy font-bold py-2.5 rounded-md text-sm"
                >
                  Meu Portal
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuAberto(false)}
                    className="w-full text-center border border-iw-navy/30 text-iw-navy font-bold py-2.5 rounded-md text-sm"
                  >
                    Fazer Login
                  </Link>
                  <Link
                    href="/inscricao"
                    onClick={() => setMenuAberto(false)}
                    className="w-full text-center bg-iw-gold text-white font-bold py-2.5 rounded-md text-sm"
                  >
                    Inscreva-se
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
