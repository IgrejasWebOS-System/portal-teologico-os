import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolverAlunoEMatricula } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Ficha do Aluno" };

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("pt-BR");
}

export default async function FichaAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoEMatricula(user.id);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  return (
    <ImpressaoShell titulo="Ficha do Aluno" voltarPara={matricula?.course_id ? `/escola/${matricula.course_id}` : "/escola"}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Campo label="Nome completo" valor={aluno.nome_completo} full />
        <Campo label="CPF" valor={aluno.cpf ?? "—"} />
        <Campo label="E-mail" valor={aluno.email} />
        <Campo label="Telefone" valor={aluno.telefone ?? "—"} />
        <Campo label="Campo / Ministério" valor={aluno.campo_ministerio_nome ?? "—"} />
        <Campo label="Situação cadastral" valor={aluno.status} />
      </dl>

      <div className="mt-8 pt-6 border-t border-iw-border">
        <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-3">Matrícula</p>
        {matricula ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Campo label="Curso" valor={matricula.curso_nome_snapshot} full />
            <Campo label="Número de matrícula" valor={matricula.matricula} />
            <Campo label="Status" valor={matricula.status} />
            <Campo label="Data da matrícula" valor={fmtData(matricula.data_matricula)} />
          </dl>
        ) : (
          <p className="text-sm text-iw-muted">Nenhuma matrícula encontrada.</p>
        )}
      </div>

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")} — uso informativo, sem valor de certidão oficial.
      </p>
    </ImpressaoShell>
  );
}

function Campo({ label, valor, full = false }: { label: string; valor: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <p className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-iw-navy font-semibold mt-0.5">{valor}</p>
    </div>
  );
}
