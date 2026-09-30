import Link from "next/link";
import { BookUser, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import AlunosListClient from "./AlunosListClient";

type Row = {
  id: string;
  nome_completo: string;
  matricula: string;
  status: string;
  curso_pretendido: string | null;
  telefone: string | null;
  campo_ministerio_nome: string | null;
  sector_id: string | null;
  church_id: string | null;
  sectors: { name: string } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

export default async function AlunosPage() {
  const supabase = await createClient();

  const [{ data }, { data: setores }] = await Promise.all([
    supabase
      .from("ead_alunos")
      .select(
        "id, nome_completo, matricula, status, curso_pretendido, telefone, campo_ministerio_nome, sector_id, church_id, sectors(name), churches(name, is_sede)"
      )
      .order("nome_completo"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={BookUser}
        title="Aluno"
        description={`${rows.length} aluno${rows.length === 1 ? "" : "s"} matriculado${rows.length === 1 ? "" : "s"} na Escola de Teologia.`}
        backHref="/dashboard/configuracoes/persona"
        backLabel="Voltar para Persona"
        backNovoPadrao
        actions={
          <Link
            href="/admin/matriculas/nova"
            className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Nova Matrícula
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Nenhum aluno cadastrado.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Alunos são criados via matrícula (pública, direta ou auto-matrícula).
          </p>
        </div>
      ) : (
        <AlunosListClient rows={rows} setores={setores ?? []} />
      )}
    </div>
  );
}
