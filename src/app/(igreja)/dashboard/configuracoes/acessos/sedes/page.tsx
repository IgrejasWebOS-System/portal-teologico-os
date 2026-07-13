import Link from "next/link";
import { ArrowLeft, Map, Plus, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function SedesPage() {
  const supabase = await createClient();

  // Sedes = igrejas marcadas como is_sede = true (ou com church_type específico)
  const { data } = await supabase
    .from("churches")
    .select("id, name, sectors(name)")
    .or("is_sede.eq.true,is_headquarters.eq.true")
    .order("name");

  const sedes = (data ?? []) as unknown as Array<{ id: string; name: string; sectors: { name: string } | null }>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/configuracoes/acessos"
            className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-iw-sky/20 flex items-center justify-center shrink-0">
              <Map className="w-5 h-5 text-iw-navy" />
            </div>
            <div>
              <h1 className="text-xl font-black text-iw-navy tracking-tight">Sedes Regionais</h1>
              <p className="text-iw-muted text-xs mt-0.5">Gestão de igrejas elevadas ao status de Sede de Campo</p>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Promover Igreja a Sede
        </button>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome da Sede (Igreja)</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Setor Vinculado</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
        </div>

        {sedes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Map className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">Nenhuma sede definida.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Promova uma Igreja ao status de Sede para que apareça aqui.
            </p>
            <p className="text-iw-muted/50 text-xs mt-2">
              (Requer coluna <code className="bg-iw-bg px-1 rounded">is_sede boolean</code> na tabela <code className="bg-iw-bg px-1 rounded">churches</code>)
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {sedes.map((sede) => (
              <li key={sede.id} className="grid grid-cols-[1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 gap-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-iw-gold shrink-0" />
                  <span className="text-sm font-semibold text-iw-navy">{sede.name}</span>
                </div>
                <span className="text-xs font-medium text-iw-navy bg-iw-bg border border-iw-border px-2.5 py-1 rounded-full w-fit">
                  {sede.sectors?.name ?? "—"}
                </span>
                <button className="text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8">
                  Gerenciar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
