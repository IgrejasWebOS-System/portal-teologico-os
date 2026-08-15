import Link from "next/link";
import { BookUser, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";

type Row = {
  id: string;
  nome_completo: string;
  matricula: string;
  status: string;
  curso_pretendido: string | null;
  telefone: string | null;
  campo_ministerio_nome: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  ATIVO: "bg-iw-success-bg text-iw-success",
  INATIVO: "bg-iw-bg text-iw-muted",
  TRANCADO: "bg-iw-warning-bg text-iw-warning",
};

export default async function AlunosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ead_alunos")
    .select("id, nome_completo, matricula, status, curso_pretendido, telefone, campo_ministerio_nome")
    .order("nome_completo");

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={BookUser}
        title="Aluno"
        description={`${rows.length} aluno${rows.length === 1 ? "" : "s"} matriculado${rows.length === 1 ? "" : "s"} na Escola de Teologia.`}
        backHref="/dashboard/configuracoes/persona"
        backLabel="Voltar para Persona"
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

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Matrícula</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Curso pretendido</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Campo / Ministério</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Status</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm font-medium">Nenhum aluno cadastrado.</p>
            <p className="text-iw-muted/60 text-xs mt-1">
              Alunos são criados via matrícula (pública, direta ou auto-matrícula).
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4">
                <span className="text-sm font-semibold text-iw-navy truncate">{r.nome_completo}</span>
                <span className="text-xs text-iw-muted truncate">{r.matricula}</span>
                <span className="text-xs text-iw-muted truncate">{r.curso_pretendido ?? "—"}</span>
                <span className="text-xs text-iw-muted truncate">{r.campo_ministerio_nome ?? "—"}</span>
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-center ${
                    STATUS_STYLE[r.status] ?? "bg-iw-bg text-iw-muted"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
