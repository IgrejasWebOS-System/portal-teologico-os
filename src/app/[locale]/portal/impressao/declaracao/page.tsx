import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoEMatricula } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Declaração" };

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("pt-BR");
}

export default async function DeclaracaoImpressaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoEMatricula(user.id);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();
  let licoesFeitas: { title: string; order_index: number }[] = [];
  let totalLicoes = 0;

  if (matricula?.course_id) {
    const { data: lessons } = await admin
      .from("lessons")
      .select("id, title, order_index")
      .eq("course_id", matricula.course_id)
      .order("order_index");

    totalLicoes = lessons?.length ?? 0;

    const { data: completions } = await admin
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", user.id)
      .in("lesson_id", (lessons ?? []).map((l) => l.id));

    const feitasIds = new Set((completions ?? []).map((c) => c.lesson_id));
    licoesFeitas = (lessons ?? []).filter((l) => feitasIds.has(l.id)).map((l) => ({ title: l.title, order_index: l.order_index }));
  }

  return (
    <ImpressaoShell titulo="Declaração de Matrícula" voltarPara={matricula?.course_id ? `/escola/${matricula.course_id}` : "/escola"}>
      {!matricula ? (
        <p className="text-sm text-iw-muted">Nenhuma matrícula encontrada.</p>
      ) : (
        <>
          <p className="text-sm text-iw-navy leading-relaxed">
            Declaramos, para os devidos fins, que <strong>{aluno.nome_completo}</strong>
            {aluno.cpf && <> (CPF {aluno.cpf})</>}, matrícula nº <strong>{matricula.matricula}</strong>, está regularmente
            matriculado(a) no curso <strong>{matricula.curso_nome_snapshot}</strong> do Centro Educacional Teológico
            Assembleia de Deus Piracicaba (CETADP), desde {fmtData(matricula.data_matricula)}, com situação de matrícula{" "}
            <strong>{matricula.status}</strong>.
          </p>

          <div className="mt-6 pt-6 border-t border-iw-border">
            <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-3">
              Lições concluídas até o momento ({licoesFeitas.length}/{totalLicoes})
            </p>
            {licoesFeitas.length === 0 ? (
              <p className="text-sm text-iw-muted">Nenhuma lição concluída ainda.</p>
            ) : (
              <ol className="list-decimal list-inside text-sm text-iw-navy space-y-1">
                {licoesFeitas
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((l) => (
                    <li key={l.order_index}>{l.title}</li>
                  ))}
              </ol>
            )}
          </div>

          <p className="mt-8 text-sm text-iw-navy">
            Piracicaba-SP, {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.
          </p>

          <div className="mt-10 pt-6 text-center">
            <div className="w-64 mx-auto border-t border-iw-navy pt-2">
              <p className="text-xs text-iw-muted">Secretaria — CETADP</p>
            </div>
          </div>
        </>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado automaticamente pelo Portal do Aluno CETADP — não substitui declaração assinada pela secretaria, se exigida pela instituição de destino.
      </p>
    </ImpressaoShell>
  );
}
