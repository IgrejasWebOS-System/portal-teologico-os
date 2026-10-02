"use client";

// ============================================================
// Busca por Setor/Regional + nome (29/09/2026, pedido do Joaquim: "um
// professor me ligou, tenho que olhar a lista toda" — lista sem filtro
// não escala). Filtro 100% client-side porque a lista inteira já vem
// carregada do server component (mesmo padrão simples usado em telas
// pequenas do admin) -- sem precisar de nova query por letra digitada.
// "SEDE" é um valor especial (não é um sector_id de verdade) porque a
// SEDE não tem setor -- é a própria igreja marcada church.is_sede=true.
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Search, LogIn, Loader2 } from "lucide-react";
import { deleteProfessorFormAction, acessarPortalProfessorAction } from "../actions";

type Row = {
  id: string;
  nome_completo: string;
  cargo: string | null;
  telefone: string | null;
  veio_de_fora: boolean;
  matricula: string | null;
  sector_id: string | null;
  sectors: { name: string } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

interface SetorItem {
  id: string;
  name: string;
}

export default function ProfessoresListClient({
  rows,
  setores,
}: {
  rows: Row[];
  setores: SetorItem[];
}) {
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("");
  const [acessandoId, setAcessandoId] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);

  // 30/09/2026, pedido do Joaquim: "entrar como o professor de verdade" —
  // gera um link de login real (mesmo mecanismo do convite) e abre numa
  // aba nova. Troca a sessão do navegador pra a do professor (é login de
  // verdade, não um modo "visualização"), por isso abre em aba separada —
  // decisão confirmada com o Joaquim (ver actions.ts).
  async function handleAcessarPortal(id: string) {
    setAcessandoId(id);
    setErroAcesso(null);
    try {
      const res = await acessarPortalProfessorAction(id);
      if (!res.success || !res.url) {
        setErroAcesso(res.message ?? "Erro ao gerar o link de acesso.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setAcessandoId(null);
    }
  }

  const rowsFiltradas = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (buscaLower && !r.nome_completo.toLowerCase().includes(buscaLower)) return false;
      if (setorFiltro === "SEDE" && !r.churches?.is_sede) return false;
      if (setorFiltro && setorFiltro !== "SEDE" && r.sector_id !== setorFiltro) return false;
      return true;
    });
  }, [rows, busca, setorFiltro]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5">
          <Search className="w-4 h-4 text-iw-muted shrink-0" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome do professor..."
            className="flex-1 bg-transparent border-none p-0 text-sm text-black placeholder-iw-muted focus:outline-none focus:ring-0"
          />
        </div>
        <select
          value={setorFiltro}
          onChange={(e) => setSetorFiltro(e.target.value)}
          className="bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm text-black cursor-pointer sm:w-64"
        >
          <option value="">Todos os setores/regionais</option>
          <option value="SEDE">SEDE</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {erroAcesso && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {erroAcesso}
        </div>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Cargo</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja / Setor</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Telefone</span>
          <span></span>
        </div>

        {rowsFiltradas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-iw-muted text-sm font-medium">Nenhum professor encontrado com esse filtro.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {rowsFiltradas.map((r) => (
              <li key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                <span className="text-sm font-semibold text-iw-navy truncate inline-flex items-center gap-1.5">
                  {r.nome_completo}
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                      r.veio_de_fora ? "bg-iw-gold/10 text-iw-gold" : "bg-iw-blue/10 text-iw-navy"
                    }`}
                  >
                    {r.veio_de_fora ? "De fora" : "Membro"}
                  </span>
                </span>
                <span className="text-xs text-iw-muted truncate">
                  {r.cargo ?? "—"}
                  {r.matricula && <span className="text-iw-muted/60"> · {r.matricula}</span>}
                </span>
                <span className="text-xs text-iw-muted truncate">
                  {r.churches?.name ?? "—"} {r.sectors?.name ? `· ${r.sectors.name}` : ""}
                </span>
                <span className="text-xs text-iw-muted truncate">{r.telefone ?? "—"}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={acessandoId === r.id}
                    onClick={() => handleAcessarPortal(r.id)}
                    title="Acessar o portal deste professor (abre numa aba nova)"
                    className="text-iw-muted hover:text-iw-blue transition-colors disabled:opacity-50"
                  >
                    {acessandoId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Link
                    href={`/dashboard/configuracoes/professores/editar/${r.id}`}
                    className="text-iw-muted hover:text-iw-navy transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <form action={deleteProfessorFormAction.bind(null, r.id)}>
                    <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
