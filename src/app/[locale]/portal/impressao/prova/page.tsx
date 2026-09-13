import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoEMatricula } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Prova" };

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ProvaImpressaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoEMatricula(user.id);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();
  let provas: {
    lessonTitle: string | null;
    status: string;
    nota: number | null;
    aprovado: boolean | null;
    finalizadaEm: string | null;
  }[] = [];

  if (matricula) {
    const { data: avaliacoes } = await admin
      .from("avaliacoes")
      .select("lesson_id, status, nota, aprovado, finalizada_em")
      .eq("matricula_id", matricula.id)
      .eq("tipo", "PROVA")
      .order("finalizada_em", { ascending: false });

    const lessonIds = Array.from(new Set((avaliacoes ?? []).map((a) => a.lesson_id).filter(Boolean))) as string[];
    const { data: lessons } = lessonIds.length
      ? await admin.from("lessons").select("id, title").in("id", lessonIds)
      : { data: [] };
    const titleMap = new Map((lessons ?? []).map((l) => [l.id, l.title]));

    provas = (avaliacoes ?? []).map((a) => ({
      lessonTitle: a.lesson_id ? titleMap.get(a.lesson_id) ?? null : null,
      status: a.status,
      nota: a.nota,
      aprovado: a.aprovado,
      finalizadaEm: a.finalizada_em,
    }));
  }

  return (
    <ImpressaoShell titulo="Prova" voltarPara={matricula?.course_id ? `/escola/${matricula.course_id}` : "/escola"}>
      <p className="text-sm text-iw-muted mb-4">
        {aluno.nome_completo} — {matricula?.curso_nome_snapshot ?? "—"}
      </p>

      {provas.length === 0 ? (
        <p className="text-sm text-iw-muted">Nenhuma prova realizada ainda.</p>
      ) : (
        <div className="space-y-3">
          {provas.map((p, i) => (
            <div key={i} className="border border-iw-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-iw-navy text-sm">{p.lessonTitle ?? "Prova geral do curso"}</p>
                <p className="text-xs text-iw-muted mt-0.5">
                  {p.status === "FINALIZADA" ? `Finalizada em ${fmtData(p.finalizadaEm)}` : "Em andamento"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-iw-navy">{p.nota != null ? Number(p.nota).toFixed(1) : "—"}</p>
                {p.aprovado != null && (
                  <p className={`text-xs font-bold ${p.aprovado ? "text-iw-success" : "text-iw-error"}`}>
                    {p.aprovado ? "Aprovado" : "Não aprovado"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")}.
      </p>
    </ImpressaoShell>
  );
}
