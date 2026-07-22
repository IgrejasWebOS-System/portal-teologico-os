import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NovoProfessorForm from "./NovoProfessorForm";

export default async function NovoProfessorPage() {
  const supabase = await createClient();

  const [setoresRes, churchesRes] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name, sector_id").order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link
          href="/dashboard/configuracoes/professores"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Professores
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Novo Professor</h1>
            <p className="text-iw-muted text-xs mt-0.5">Vincula um membro (por matrícula) como professor de um setor/igreja.</p>
          </div>
        </div>
      </div>

      <NovoProfessorForm
        setores={setoresRes.data ?? []}
        churches={churchesRes.data ?? []}
      />
    </div>
  );
}
