import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoParaImpressao } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";
import ImprimirSecaoBotao from "@/components/impressao/ImprimirSecaoBotao";

export const metadata = { title: "Testes" };

interface PageProps {
  searchParams: Promise<{ alunoId?: string }>;
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function TestesImpressaoPage({ searchParams }: PageProps) {
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

  // Agrupado por número do teste (1 a 4) — pedido do Joaquim em
  // 14/09/2026: cada teste vira sua própria seção com título e um botão
  // de impressão que imprime só aquele teste, em sequência (Teste 1,
  // depois Teste 2, etc.), em vez de uma tabela única com tudo junto.
  const testesNumeros = Array.from(new Set(linhas.map((l) => l.numeroTeste).filter((n): n is number => n != null))).sort(
    (a, b) => a - b
  );

  return (
    <ImpressaoShell
      titulo="Testes por Matéria"
      voltarPara={
        alunoId
          ? `/dashboard/configuracoes/persona/alunos/${alunoId}`
          : matricula?.course_id
            ? `/escola/${matricula.course_id}`
            : "/escola"
      }
    >
      <style>{`
        @media print {
          ${testesNumeros
            .map(
              (n) =>
                `body[data-imprimir-secao="teste-${n}"] [data-secao]:not([data-secao="teste-${n}"]) { display: none !important; }`
            )
            .join("\n")}
        }
      `}</style>

      <p className="text-sm text-iw-muted mb-2">
        {aluno.nome_completo} — {matricula?.curso_nome_snapshot ?? "—"}
      </p>

      {linhas.length > 0 && (
        <p className="text-xs text-iw-muted/80 bg-iw-bg border border-iw-border rounded-lg px-3 py-2 mb-6 print:hidden">
          O botão <strong>&ldquo;Imprimir / Salvar PDF&rdquo;</strong> no topo imprime todos os testes, em páginas
          separadas. Para impressão individual, clique no botão ao lado do teste desejado.
        </p>
      )}

      {linhas.length === 0 ? (
        <p className="text-sm text-iw-muted">Nenhum teste realizado ainda.</p>
      ) : (
        <div className="space-y-8">
          {testesNumeros.map((numero) => {
            const doTeste = linhas.filter((l) => l.numeroTeste === numero);
            return (
              <div key={numero} data-secao={`teste-${numero}`} className="break-inside-avoid">
                <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b-2 border-iw-navy">
                  <h2 className="text-base font-black text-iw-navy">Teste {numero}</h2>
                  <ImprimirSecaoBotao secaoId={`teste-${numero}`} label={`Imprimir Teste ${numero}`} />
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[480px] text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-iw-border text-left">
                        <th className="py-2 pr-3 font-bold text-iw-navy">Matéria</th>
                        <th className="py-2 pr-3 font-bold text-iw-navy">Status</th>
                        <th className="py-2 pr-3 font-bold text-iw-navy">Nota</th>
                        <th className="py-2 font-bold text-iw-navy">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doTeste.map((l, i) => (
                        <tr key={i} className="border-b border-iw-border">
                          <td className="py-2 pr-3">{l.lessonTitle}</td>
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")}.
      </p>
    </ImpressaoShell>
  );
}
