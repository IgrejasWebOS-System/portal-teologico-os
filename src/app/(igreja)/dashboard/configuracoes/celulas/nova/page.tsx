import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovaIgrejaForm from "../../igrejas/nova/NovaIgrejaForm";

export default async function NovaCelulaPage() {
  const supabase = await createClient();

  const [setoresRes, igrejasRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase
      .from("churches")
      .select("id, name")
      .in("church_type", ["CHURCH", "SUB"])
      .order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard/configuracoes/celulas"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Células
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-success/10 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5 text-iw-success" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Nova Célula</h1>
            <p className="text-iw-muted text-xs mt-0.5">Vinculada a uma igreja/sub-congregação e a um setor.</p>
          </div>
        </div>
      </div>

      <NovaIgrejaForm
        setores={setoresRes.data ?? []}
        igrejasMae={igrejasRes.data ?? []}
        lockedType="CELL"
        backHref="/dashboard/configuracoes/celulas"
        submitLabel="Cadastrar Célula"
      />
    </div>
  );
}
