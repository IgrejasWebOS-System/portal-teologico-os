import { UserCog, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import AddMemberFunctionForm from "./AddMemberFunctionForm";
import { deleteMemberFunctionFormAction } from "./funcoes-actions";

type MemberFunctionRow = {
  id: string;
  escopo: "IGREJA" | "SETOR";
  departments: { name: string } | null;
  function_roles: { name: string } | null;
  churches: { name: string } | null;
  sectors: { name: string } | null;
};

export default async function MemberFunctionsCard({
  memberId,
  churchId,
  msg,
  error,
}: {
  memberId: string;
  churchId: string | null;
  msg?: string;
  error?: string;
}) {
  const supabase = await createClient();

  const [
    { data: church },
    { data: funcoesRaw },
    { data: departamentosRaw },
    { data: papeisRaw },
    { data: setoresRaw },
  ] = await Promise.all([
    churchId
      ? supabase.from("churches").select("id, name, sector_id").eq("id", churchId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("member_functions")
      .select("id, escopo, departments(name), function_roles(name), churches(name), sectors(name)")
      .eq("member_id", memberId)
      .order("created_at"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("function_roles").select("id, name").order("name"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  const funcoes = (funcoesRaw ?? []) as unknown as MemberFunctionRow[];
  const departamentos = (departamentosRaw ?? []) as { id: string; name: string }[];
  const papeis = (papeisRaw ?? []) as { id: string; name: string }[];
  const setores = (setoresRaw ?? []) as { id: string; name: string }[];

  let setorPadraoId: string | null = null;
  let setorPadraoName: string | null = null;
  if (church?.sector_id) {
    setorPadraoId = church.sector_id as string;
    setorPadraoName = setores.find((s) => s.id === setorPadraoId)?.name ?? null;
  }

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
        <div className="w-6 h-6 rounded-lg bg-[#E88D0C] flex items-center justify-center shrink-0">
          <UserCog className="w-3.5 h-3.5 text-black" />
        </div>
        <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">Funções</h2>
      </div>

      {msg && (
        <div className="px-4 py-2.5 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-xs font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-xs font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      {funcoes.length === 0 ? (
        <p className="text-xs text-iw-muted">Nenhuma função atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {funcoes.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 bg-iw-bg/60 border border-iw-border rounded-xl px-3.5 py-2.5"
            >
              <div className="min-w-0 text-xs">
                <span className="font-bold text-iw-navy">{f.function_roles?.name ?? "—"}</span>
                <span className="text-iw-muted"> · {f.departments?.name ?? "—"} · </span>
                <span className="font-semibold text-iw-sky">
                  {f.escopo === "IGREJA" ? f.churches?.name ?? "Igreja" : f.sectors?.name ?? "Setor"}
                </span>
                <span className="text-[10px] font-bold uppercase text-iw-muted ml-1">
                  ({f.escopo === "IGREJA" ? "igreja" : "setor"})
                </span>
              </div>
              <form action={deleteMemberFunctionFormAction.bind(null, f.id, memberId)} className="shrink-0">
                <button type="submit" className="text-iw-muted hover:text-iw-error transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {churchId && church && (
        <AddMemberFunctionForm
          memberId={memberId}
          churchId={churchId}
          churchName={church.name as string}
          setorPadraoId={setorPadraoId}
          setorPadraoName={setorPadraoName}
          departamentos={departamentos}
          papeis={papeis}
          setores={setores}
        />
      )}
    </div>
  );
}
