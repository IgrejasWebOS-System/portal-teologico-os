import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Plus, IdCard, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Matrículas — CETADP" };

const STATUS_STYLE: Record<string, string> = {
  EM_ANDAMENTO: "bg-iw-blue/10 text-iw-blue border-iw-blue/30",
  APROVADO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  REPROVADO: "bg-iw-error-bg text-iw-error border-iw-error/30",
  CANCELADO: "bg-iw-bg text-iw-muted border-iw-border",
};

const ORIGEM_LABEL: Record<string, string> = {
  INSCRICAO_PUBLICA: "Inscrição pública",
  MATRICULA_DIRETA: "Matrícula direta",
};

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function MatriculasPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const { data: matriculas } = await supabase
    .from("ead_matriculas")
    .select("*, ead_alunos(nome_completo, cpf, email)")
    .order("data_matricula", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Matrículas</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Todas as matrículas por curso — vindas da inscrição pública ou lançadas direto pela secretaria.
            </p>
          </div>
        </div>
        <Link
          href="/admin/matriculas/nova"
          className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova matrícula direta
        </Link>
      </div>

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

      {!matriculas || matriculas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhuma matrícula registrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matriculas.map((m) => {
            const alunoInfo = m.ead_alunos as unknown as
              | { nome_completo: string; cpf: string | null; email: string }
              | null;
            return (
              <div
                key={m.id}
                className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-iw-navy">{alunoInfo?.nome_completo ?? "—"}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-iw-muted">
                      {alunoInfo?.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {alunoInfo.email}
                        </span>
                      )}
                      {alunoInfo?.cpf && (
                        <span className="inline-flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          {alunoInfo.cpf}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[m.status] ?? STATUS_STYLE.EM_ANDAMENTO}`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-iw-muted">
                  <span><strong className="text-iw-navy">Curso:</strong> {m.curso_nome_snapshot}</span>
                  <span><strong className="text-iw-navy">Matrícula:</strong> {m.matricula}</span>
                  <span><strong className="text-iw-navy">Origem:</strong> {ORIGEM_LABEL[m.origem] ?? m.origem}</span>
                  {m.nota_final != null && (
                    <span><strong className="text-iw-navy">Nota final:</strong> {Number(m.nota_final).toFixed(1)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
