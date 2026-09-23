import { Users2, Plus, X, UserCog } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import { definirLiderSetorFormAction, removerLiderSetorFormAction } from "../../actions";
import LiderancaSetorCard from "./LiderancaSetorCard";

type SectorLeader = {
  id: string;
  name: string;
  mother_church_id: string | null;
  churches: { name: string } | null;
};

type FuncaoSetorRow = {
  id: string;
  members: { full_name: string } | null;
  departments: { name: string } | null;
  function_roles: { name: string } | null;
};

interface PageProps {
  searchParams: Promise<{ setor?: string; msg?: string; error?: string }>;
}

export default async function LidereSetorPage({ searchParams }: PageProps) {
  const { setor: setorSelecionado, msg, error } = await searchParams;
  const supabase = await createClient();

  const [sectorsRes, churchesRes, departamentosRes, papeisRes] = await Promise.all([
    supabase
      // 23/09/2026, achado do Joaquim: sectors tem DUAS FKs pra churches
      // (mother_church_id e headquarters_id) — sem apontar qual delas usar
      // no embed, o PostgREST retorna erro de ambiguidade (PGRST201) e a
      // página engolia isso silenciosamente, mostrando o dropdown vazio.
      .from("sectors")
      .select("id, name, mother_church_id, churches!sectors_mother_church_id_fkey(name)")
      .order("name"),
    supabase
      .from("churches")
      .select("id, name")
      .eq("church_type", "CHURCH")
      .order("name"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("function_roles").select("id, name").order("name"),
  ]);

  const sectors = (sectorsRes.data ?? []) as unknown as SectorLeader[];
  const churches = churchesRes.data ?? [];
  const departamentos = departamentosRes.data ?? [];
  const papeis = papeisRes.data ?? [];
  const withLeader    = sectors.filter((s) => s.mother_church_id);
  const withoutLeader = sectors.filter((s) => !s.mother_church_id);

  const setorAtual = setorSelecionado ? sectors.find((s) => s.id === setorSelecionado) : null;
  let funcoesSetor: { id: string; member_name: string; department_name: string; function_role_name: string }[] = [];
  if (setorAtual) {
    const { data } = await supabase
      .from("member_functions")
      .select("id, members(full_name), departments(name), function_roles(name)")
      .eq("escopo", "SETOR")
      .eq("sector_id", setorAtual.id)
      .order("created_at");
    funcoesSetor = ((data ?? []) as unknown as FuncaoSetorRow[]).map((f) => ({
      id: f.id,
      member_name: f.members?.full_name ?? "—",
      department_name: f.departments?.name ?? "—",
      function_role_name: f.function_roles?.name ?? "—",
    }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Users2}
        title="Líderes de Setor"
        description="Defina a Igreja-Mãe responsável por cada setor"
        backHref="/dashboard/configuracoes/acessos"
        backLabel="Voltar"
        backNovoPadrao
      />

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Definir / alterar líder de um setor */}
      <form
        action={definirLiderSetorFormAction}
        className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Setor</label>
          <select
            name="setor_id"
            required
            className="w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer"
          >
            <option value="">Selecione um setor...</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.mother_church_id ? ` (líder: ${s.churches?.name ?? "?"})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Igreja-Mãe</label>
          <select
            name="church_id"
            required
            className="w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer"
          >
            <option value="">Selecione uma igreja...</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Definir
        </button>
      </form>

      {setorAtual && (
        <div id="lideranca-setor">
          <LiderancaSetorCard
            sectorId={setorAtual.id}
            sectorName={setorAtual.name}
            sectors={sectors.map((s) => ({ id: s.id, name: s.name }))}
            funcoes={funcoesSetor}
            departamentos={departamentos}
            papeis={papeis}
          />
        </div>
      )}

      {withLeader.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja-Mãe</span>
            <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
          </div>
          <ul className="divide-y divide-iw-border">
            {withLeader.map((s) => (
              <li key={s.id} className="grid grid-cols-[1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 gap-4">
                <span className="text-sm font-semibold text-iw-navy">{s.name}</span>
                <span className="text-sm text-iw-muted">{s.churches?.name ?? "—"}</span>
                <div className="flex items-center gap-3 ml-auto">
                  <Link
                    href={`/dashboard/configuracoes/acessos/lideres-setor?setor=${s.id}#lideranca-setor`}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                      setorSelecionado === s.id
                        ? "bg-iw-navy text-white border-iw-navy"
                        : "bg-white text-iw-navy border-iw-navy hover:bg-iw-bg"
                    }`}
                    title="Gerenciar liderança do setor"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    Liderança
                  </Link>
                  <form action={removerLiderSetorFormAction.bind(null, s.id)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1 text-xs font-semibold text-iw-muted hover:text-iw-error transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-error-bg"
                      title="Remover liderança"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withoutLeader.length > 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-warning/30 overflow-hidden shadow-sm">
          <div className="px-5 py-2.5 bg-iw-warning-bg border-b border-iw-warning/20">
            <span className="text-xs font-bold text-iw-warning uppercase tracking-wider">
              Setores sem líder definido ({withoutLeader.length})
            </span>
          </div>
          <ul className="divide-y divide-iw-border">
            {withoutLeader.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-iw-bg/50">
                <span className="text-sm font-semibold text-iw-navy">{s.name}</span>
                <Link
                  href={`/dashboard/configuracoes/acessos/lideres-setor?setor=${s.id}#lideranca-setor`}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    setorSelecionado === s.id
                      ? "bg-iw-navy text-white border-iw-navy"
                      : "bg-white text-iw-navy border-iw-navy hover:bg-iw-bg"
                  }`}
                  title="Gerenciar liderança do setor"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Liderança
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sectors.length === 0 && (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold px-5 py-12 text-center shadow-sm">
          <Users2 className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhuma liderança definida.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Cadastre setores primeiro em Configurações → Setores.
          </p>
        </div>
      )}
    </div>
  );
}
