import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { submeterAvaliacaoAction, refazerAvaliacaoAction } from "../actions";

// 29/09/2026, pedido do Joaquim: nota mínima de aprovação passou a valer
// pra teste, simulado e prova (antes só prova tinha essa checagem, com
// 6,0). Duplicado aqui (não importado de actions.ts porque aquele arquivo
// é "use server" e não pode exportar uma constante simples pra um
// Server Component) — mesmo valor de NOTA_MINIMA em avaliacoes/actions.ts.
const NOTA_MINIMA = 6.1;

const TITULO_TIPO: Record<string, string> = {
  PROVA: "Prova",
  SIMULADO: "Simulado",
  TESTE_LICAO: "Teste",
};

export const metadata = { title: "Avaliação — Portal do Aluno" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; voltar?: string }>;
}

function resolveVoltarHref(voltar: string | undefined): string {
  const isInterno = !!voltar && voltar.startsWith("/") && !voltar.startsWith("//");
  if (!isInterno) return "/portal/avaliacoes";
  return voltar as string;
}

export default async function AvaliacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, voltar } = await searchParams;
  const voltarHref = resolveVoltarHref(voltar);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: avaliacao } = await supabase
    .from("avaliacoes")
    .select("id, tipo, status, num_questoes, acertos, nota, aprovado, gabarito_provisorio, numero_teste, ead_matriculas(curso_nome_snapshot)")
    .eq("id", id)
    .single();

  if (!avaliacao) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center justify-center px-8">
        <p className="text-iw-muted text-sm">Avaliação não encontrada.</p>
      </div>
    );
  }

  const matriculaInfo = avaliacao.ead_matriculas as unknown as { curso_nome_snapshot: string } | null;

  const { data: questoes } = await supabase
    .from("avaliacao_questoes")
    .select("id, ordem, enunciado, opcoes, resposta_correta_index, resposta_aluno_index, correta")
    .eq("avaliacao_id", id)
    .order("ordem");

  const finalizada = avaliacao.status === "FINALIZADA";

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLTAR
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">
            {TITULO_TIPO[avaliacao.tipo] ?? avaliacao.tipo}
            {avaliacao.tipo === "TESTE_LICAO" && avaliacao.numero_teste ? ` ${avaliacao.numero_teste}` : ""}
            {" — "}{matriculaInfo?.curso_nome_snapshot}
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">
            {avaliacao.num_questoes}{" "}
            {avaliacao.tipo === "TESTE_LICAO" ? "questões de Certo/Errado." : "questões de múltipla escolha."}
          </p>
        </div>

        {avaliacao.gabarito_provisorio && (
          <div className="flex items-start gap-2 bg-iw-warning-bg border border-iw-warning/30 text-iw-warning px-4 py-3 rounded-xl text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Gabarito provisório — as respostas corretas deste teste ainda não foram confirmadas pela
              secretaria. A nota mostrada aqui não vale como avaliação real ainda.
            </span>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
            {decodeURIComponent(error)}
          </div>
        )}

        {finalizada ? (
          <>
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 text-center space-y-2">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${avaliacao.aprovado === false ? "bg-iw-error-bg" : "bg-iw-success-bg"}`}>
                {avaliacao.aprovado === false ? (
                  <XCircle className="w-7 h-7 text-iw-error" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-iw-success" />
                )}
              </div>
              <p className="text-3xl font-black text-iw-navy">{Number(avaliacao.nota).toFixed(1)}</p>
              <p className="text-iw-muted text-sm">
                {avaliacao.acertos} de {avaliacao.num_questoes} corretas
              </p>

              {/* 29/09/2026, pedido do Joaquim: média mínima (6,1) e botão
                  de refazer valem pra TODOS os tipos agora, não só prova —
                  "botão suspenso" vermelho enquanto reprovado, vira verde
                  ao atingir a média. Sem limite de tentativas. */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
                  avaliacao.aprovado ? "bg-iw-success-bg text-iw-success" : "bg-iw-error-bg text-iw-error"
                }`}
              >
                {avaliacao.aprovado ? "Aprovado" : "Abaixo da média"} (mínimo {NOTA_MINIMA.toFixed(1).replace(".", ",")})
              </div>

              {!avaliacao.aprovado && (
                <form action={refazerAvaliacaoAction} className="pt-2">
                  <input type="hidden" name="avaliacao_id" value={avaliacao.id} />
                  <button
                    type="submit"
                    className="w-full bg-iw-error hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-xl transition-opacity"
                  >
                    Refazer {avaliacao.tipo === "PROVA" ? "prova" : avaliacao.tipo === "TESTE_LICAO" ? "teste" : "simulado"}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-3">
              {(questoes ?? []).map((q) => {
                const opcoes = q.opcoes as string[];
                const ehCertoErrado = avaliacao.tipo === "TESTE_LICAO";

                if (ehCertoErrado) {
                  const isCorreta = q.resposta_correta_index === 0; // 0 = Certo
                  const acertou = q.resposta_aluno_index === q.resposta_correta_index;
                  return (
                    <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4 flex items-start gap-3">
                      <span
                        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border-2 ${
                          isCorreta
                            ? "border-iw-success bg-iw-success-bg text-iw-success"
                            : "border-iw-error bg-iw-error-bg text-iw-error"
                        }`}
                      >
                        {isCorreta ? "C" : "E"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-iw-navy">{q.ordem}. {q.enunciado}</p>
                        <p className={`text-xs mt-1 font-semibold ${acertou ? "text-iw-success" : "text-iw-error"}`}>
                          Você marcou {q.resposta_aluno_index === 0 ? "C" : q.resposta_aluno_index === 1 ? "E" : "—"}
                          {acertou ? " — correto" : ` — o certo era ${isCorreta ? "C" : "E"}`}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4">
                    <p className="text-sm font-semibold text-iw-navy mb-2">{q.ordem}. {q.enunciado}</p>
                    <ul className="space-y-1">
                      {opcoes.map((op, i) => {
                        const isCorreta = i === q.resposta_correta_index;
                        const isEscolhida = i === q.resposta_aluno_index;
                        return (
                          <li
                            key={i}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${
                              isCorreta
                                ? "border-iw-success bg-iw-success-bg text-iw-success font-semibold"
                                : isEscolhida
                                  ? "border-iw-error bg-iw-error-bg text-iw-error"
                                  : "border-iw-border text-iw-muted"
                            }`}
                          >
                            {op}
                            {isEscolhida && !isCorreta && " (sua resposta)"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {avaliacao.tipo === "PROVA" && (
              <div className="flex items-start gap-2 bg-iw-warning-bg border border-iw-warning/30 text-iw-warning px-4 py-3 rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Nota mínima de aprovação: 6,1. Se não atingir, você pode refazer.</span>
              </div>
            )}

            <form action={submeterAvaliacaoAction} className="space-y-4">
              <input type="hidden" name="avaliacao_id" value={avaliacao.id} />
              {(questoes ?? []).map((q) => {
                const opcoes = q.opcoes as string[];

                if (avaliacao.tipo === "TESTE_LICAO") {
                  // 26/09/2026, pedido do Joaquim: botão de resposta na mesma
                  // linha da pergunta, sem o texto "Certo"/"Errado" -- só a
                  // letra. Correção do mesmo dia: só o texto da PERGUNTA
                  // deveria crescer (text-sm -> text-base); o botão tinha
                  // sido aumentado por engano e ficou desproporcional --
                  // voltou menor que o tamanho original (text-sm -> text-xs,
                  // w-14/h-11 -> w-12/h-9). Vale pra todos os testes
                  // (TESTE_LICAO usa este mesmo bloco em todos eles).
                  return (
                    <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4 flex items-center justify-between gap-4">
                      <p className="text-base font-semibold text-iw-navy flex-1">{q.ordem}. {q.enunciado}</p>
                      <div className="flex gap-2 shrink-0">
                        <label className="w-12 h-9 flex items-center justify-center border-2 border-iw-success/40 bg-iw-success-bg hover:bg-iw-success/15 has-[:checked]:bg-iw-success has-[:checked]:border-iw-success has-[:checked]:text-white text-iw-success font-black text-xs rounded-xl cursor-pointer transition-colors">
                          <input type="radio" name={`questao_${q.id}`} value={0} required className="sr-only" />
                          C
                        </label>
                        <label className="w-12 h-9 flex items-center justify-center border-2 border-iw-error/40 bg-iw-error-bg hover:bg-iw-error/15 has-[:checked]:bg-iw-error has-[:checked]:border-iw-error has-[:checked]:text-white text-iw-error font-black text-xs rounded-xl cursor-pointer transition-colors">
                          <input type="radio" name={`questao_${q.id}`} value={1} required className="sr-only" />
                          E
                        </label>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4">
                    <p className="text-sm font-semibold text-iw-navy mb-3">{q.ordem}. {q.enunciado}</p>
                    <div className="space-y-2">
                      {opcoes.map((op, i) => (
                        <label key={i} className="flex items-center gap-2 text-sm text-iw-navy cursor-pointer">
                          <input type="radio" name={`questao_${q.id}`} value={i} required />
                          {op}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                type="submit"
                className="w-full bg-[#E88D0C] hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-xl transition-opacity border border-black"
              >
                Finalizar {avaliacao.tipo === "PROVA" ? "prova" : avaliacao.tipo === "TESTE_LICAO" ? "teste" : "simulado"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
