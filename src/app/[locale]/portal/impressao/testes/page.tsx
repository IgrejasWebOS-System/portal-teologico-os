import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoEMatricula } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Testes" };

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function TestesImpressaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoEMatricula(user.id);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();
  let linhas: {
    lessonTitle: string;
    numeroTeste: number | null;
    status: string;
    nota: number | null;
    finalizadaEm: string | null;
    gabaritoProvisorio: boolean;
  }[] = [];

  if (matricula) {
    const { data: avaliacoes } = await admin
      .from("avaliacoes")
      .select("lesson_id, numero_teste, status, nota, finalizada_em, gabarito_provisorio")
      .eq("matricula_id", matricula.id)
      .eq("tipo", "TESTE_LICAO")
      .order("numero_teste", { ascending: true });

    const lessonIds = Array.from(new Set((avaliacoes ?? []).map((a) => a.lesson_id).filter(Boolean))) as string[];
    const { data: lessons } = lessonIds.length
      ? await admin.from("lessons").select("id, title").in("id", lessonIds)
      : { data: [] };
    const titleMap = new Map((lessons ?? []).map((l) => [l.id, l.title]));

    linhas = (avaliacoes ?? []).map((a) => ({
      lessonTitle: (a.lesson_id && titleMap.get(a.lesson_id)) || "—",
      numeroTeste: a.numero_teste,
      status: a.status,
      nota: a.nota,
      finalizadaEm: a.finalizada_em,
      gabaritoProvisorio: a.gabarito_provisorio,
    }));
  }

  return (
    <ImpressaoShell titulo="Testes por Matéria" voltarPara={matricula?.course_id ? `/escola/${matricula.course_id}` : "/escola"}>
      <p className="text-sm text-iw-muted mb-4">
        {aluno.nome_completo} — {matricula?.curso_nome_snapshot ?? "—"}
      </p>

      {linhas.length === 0 ? (
        <p className="text-sm text-iw-muted">Nenhum teste realizado ainda.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-iw-navy text-left">
              <th className="py-2 pr-3 font-bold text-iw-navy">Matéria</th>
              <th className="py-2 pr-3 font-bold text-iw-navy">Teste</th>
              <th className="py-2 pr-3 font-bold text-iw-navy">Status</th>
              <th className="py-2 pr-3 font-bold text-iw-navy">Nota</th>
              <th className="py-2 font-bold text-iw-navy">Data</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-b border-iw-border">
                <td className="py-2 pr-3">{l.lessonTitle}</td>
                <td className="py-2 pr-3">Teste {l.numeroTeste}</td>
                <td className="py-2 pr-3">{l.status === "FINALIZADA" ? "Finalizado" : "Em andamento"}</td>
                <td className="py-2 pr-3 font-bold">
                  {l.nota != null ? Number(l.nota).toFixed(1) : "—"}
                  {l.gabaritoProvisorio && (
                    <span className="ml-1 text-[10px] text-iw-warning font-semibold">(gabarito provisório)</span>
                  )}
                </td>
                <td className="py-2">{fmtData(l.finalizadaEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")}.
      </p>
    </ImpressaoShell>
  );
}
