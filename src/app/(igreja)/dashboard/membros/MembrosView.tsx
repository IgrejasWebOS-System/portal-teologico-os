"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  Archive,
  RefreshCcw,
  MoreHorizontal,
  Pencil,
  ArchiveRestore,
  X,
  Loader2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { archiveMemberAction, restoreMemberAction } from "./actions";
import HistoricoRelatorio from "./HistoricoRelatorio";

type MemberRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
  status: string;
  financial_status: string;
  ecclesiastical_status: string | null;
  ecclesiastical_roles: { name: string } | null;
};

type Props = {
  initialMembers: MemberRow[];
};

export default function MembrosView({ initialMembers }: Props) {
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Re-busca ao trocar viewMode para ARCHIVED
  useEffect(() => {
    if (viewMode === "ACTIVE") {
      setMembers(initialMembers);
      return;
    }
    async function fetchArchived() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("members")
        .select("id, full_name, email, phone, registration_number, status, financial_status, ecclesiastical_status, ecclesiastical_roles(name)")
        .eq("status", "ARCHIVED")
        .order("full_name");
      setMembers((data as unknown as MemberRow[]) ?? []);
      setLoading(false);
    }
    fetchArchived();
  }, [viewMode, initialMembers]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      (m.registration_number ?? "").toLowerCase().includes(q) ||
      (m.phone ?? "").includes(q)
    );
  });

  const isArchived = viewMode === "ARCHIVED";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-2xl font-black text-iw-navy tracking-tight">
              {isArchived ? "Arquivo Morto" : "Gestão de Membros"}
            </h1>
            <p className="text-iw-muted text-sm">
              {isArchived ? "Membros arquivados — fora do rol ativo." : "Membros ativos da congregação."}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iw-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-iw-surface border border-iw-border rounded-xl py-2.5 pl-9 pr-9 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-iw-muted hover:text-iw-navy"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          <HistoricoRelatorio />

          <button
            onClick={() => {
              setViewMode(isArchived ? "ACTIVE" : "ARCHIVED");
              setSearch("");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              isArchived
                ? "bg-iw-blue/10 text-iw-blue border-iw-blue/30 hover:bg-iw-blue/20"
                : "bg-iw-error/8 text-iw-error border-iw-error/20 hover:bg-iw-error/15"
            }`}
          >
            {isArchived ? (
              <><RefreshCcw className="w-3.5 h-3.5" /> Membros Ativos</>
            ) : (
              <><Archive className="w-3.5 h-3.5" /> Arquivo Morto</>
            )}
          </button>

          {!isArchived && (
            <Link
              href="/dashboard/membros/novo"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-iw-blue text-white hover:bg-iw-navy transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Novo Membro
            </Link>
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
        {/* Header da tabela */}
        <div className="grid grid-cols-[1fr_140px_110px_110px_80px] gap-4 px-6 py-3 border-b border-iw-border bg-iw-bg/60">
          <span className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Membro</span>
          <span className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Cargo</span>
          <span className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Situação</span>
          <span className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Financeiro</span>
          <span className="text-xs font-semibold text-iw-muted uppercase tracking-wider text-right">Ações</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-iw-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-iw-muted text-sm">
            {search
              ? `Nenhum resultado para "${search}".`
              : isArchived
              ? "Nenhum membro arquivado."
              : "Nenhum membro cadastrado ainda."}
          </div>
        )}

        {/* Rows */}
        {!loading && (
          <div className="divide-y divide-iw-border" ref={menuRef}>
            {filtered.map((member) => {
              const role = member.ecclesiastical_roles;
              const isMenuOpen = openMenuId === member.id;

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[1fr_140px_110px_110px_80px] gap-4 px-6 py-3.5 items-center hover:bg-iw-bg/40 transition-colors"
                >
                  {/* Nome + contato — clicável para editar */}
                  <Link
                    href={`/dashboard/membros/editar/${member.id}`}
                    className="flex items-center gap-3 min-w-0 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-iw-blue/12 border border-iw-sky/25 flex items-center justify-center shrink-0 group-hover:bg-iw-blue/20 transition-colors">
                      <span className="text-iw-blue font-bold text-xs">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-iw-navy truncate group-hover:text-iw-blue transition-colors">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-iw-muted truncate">
                        {member.registration_number
                          ? `#${member.registration_number}`
                          : member.email ?? member.phone ?? "—"}
                      </p>
                    </div>
                  </Link>

                  {/* Cargo */}
                  <span className="text-xs text-iw-muted truncate">
                    {role?.name ?? "—"}
                  </span>

                  {/* Status eclesiástico */}
                  <span
                    className={`inline-flex w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${
                      member.status === "ACTIVE"
                        ? "bg-iw-success/10 text-iw-success"
                        : member.status === "DISCIPLINE"
                        ? "bg-iw-error/10 text-iw-error"
                        : "bg-iw-muted/10 text-iw-muted"
                    }`}
                  >
                    {member.status === "ACTIVE"
                      ? "Ativo"
                      : member.status === "DISCIPLINE"
                      ? "Disciplina"
                      : "Arquivado"}
                  </span>

                  {/* Status financeiro */}
                  <span
                    className={`inline-flex w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${
                      member.financial_status === "UP_TO_DATE"
                        ? "bg-iw-success/10 text-iw-success"
                        : "bg-iw-error/10 text-iw-error"
                    }`}
                  >
                    {member.financial_status === "UP_TO_DATE" ? "Em dia" : "Pendente"}
                  </span>

                  {/* Ações */}
                  <div className="flex justify-end relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(isMenuOpen ? null : member.id)
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-iw-muted hover:text-iw-navy hover:bg-iw-bg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-9 z-50 w-44 bg-iw-surface rounded-xl border border-iw-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                        {!isArchived && (
                          <Link
                            href={`/dashboard/membros/editar/${member.id}`}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-navy hover:bg-iw-bg transition-colors"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-iw-blue" />
                            Editar ficha
                          </Link>
                        )}

                        {/* Arquivar */}
                        {!isArchived && (
                          <form action={async (fd) => { await archiveMemberAction(fd); }}>
                            <input type="hidden" name="id" value={member.id} />
                            <button
                              type="submit"
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-error hover:bg-iw-error-bg transition-colors"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Arquivar membro
                            </button>
                          </form>
                        )}

                        {/* Restaurar */}
                        {isArchived && (
                          <form action={async (fd) => { await restoreMemberAction(fd); }}>
                            <input type="hidden" name="id" value={member.id} />
                            <button
                              type="submit"
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-iw-success hover:bg-iw-success-bg transition-colors"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restaurar membro
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer com contagem */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-iw-border bg-iw-bg/40 flex items-center justify-between">
            <span className="text-xs text-iw-muted">
              {filtered.length} membro{filtered.length !== 1 ? "s" : ""}
              {search && ` encontrado${filtered.length !== 1 ? "s" : ""}`}
            </span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-iw-blue hover:text-iw-navy font-medium transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
