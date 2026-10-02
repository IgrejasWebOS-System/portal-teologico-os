import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoParaImpressao } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";
import ImprimirSecaoBotao from "@/components/impressao/ImprimirSecaoBotao";

export const metadata = { title: "Prova" };

interface PageProps {
  searchParams: Promise<{ alunoId?: string }>;
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ProvaImpressaoPage({ searchParams }: PageProps) {
  const { alunoId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoParaImpressao(supabase, user.id, alunoId);
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
    <ImpressaoShell
      titulo="Prova"
      voltarPara={
        alunoId
          ? `/dashboard/configuracoes/persona/alunos/${alunoId}`
          : matricula?.course_id
            ? `/escola/${matricula.course_id}`
            : "/escola"
      }
    >
      {/* Mesmo padrão adotado em impressao/testes (14/09/2026): cada
          matéria vira sua própria seção com botão de impressão individual. */}
      <style>{`
        @media print {
          ${provas
            .map(
              (_, i) => `body[data-imprimir-secao="prova-${i}"] [data-secao]:not([data-secao="prova-${i}"]) { display: none !important; }`
            )
            .join("\n")}
        }
      `}</style>

      <p className="text-sm text-iw-muted mb-2">
        {aluno.nome_completo} — {matricula?.curso_nome_snapshot ?? "—"}
      </p>

      {provas.length > 0 && (
        <p className="text-xs text-iw-muted/80 bg-iw-bg border border-iw-border rounded-lg px-3 py-2 mb-4 print:hidden">
          O botão <strong>&ldquo;Imprimir / Salvar PDF&rdquo;</strong> no topo imprime todas as provas, em páginas
          separadas. Para impressão individual, clique no botão ao lado da matéria desejada.
        </p>
      )}

      {provas.length === 0 ? (
        <p className="text-sm text-iw-muted">Nenhuma prova realizada ainda.</p>
      ) : (
        <div className="space-y-3">
          {provas.map((p, i) => (
            <div
              key={i}
              data-secao={`prova-${i}`}
              className="border border-iw-border rounded-xl p-4 flex items-center justify-between gap-4 break-inside-avoid"
            >
              <div>
                <p className="font-bold text-iw-navy text-sm">{p.lessonTitle ?? "Prova geral do curso"}</p>
                <p className="text-xs text-iw-muted mt-0.5">
                  {p.status === "FINALIZADA" ? `Finalizada em ${fmtData(p.finalizadaEm)}` : "Em andamento"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-black text-iw-navy">{p.nota != null ? Number(p.nota).toFixed(1) : "—"}</p>
                  {p.aprovado != null && (
                    <p className={`text-xs font-bold ${p.aprovado ? "text-iw-success" : "text-iw-error"}`}>
                      {p.aprovado ? "Aprovado" : "Não aprovado"}
                    </p>
                  )}
                </div>
                <ImprimirSecaoBotao secaoId={`prova-${i}`} label="Imprimir" />
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
