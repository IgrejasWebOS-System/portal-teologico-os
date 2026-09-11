import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { submeterAvaliacaoAction } from "../actions";

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

function resolveVoltarHref(voltar: string | undefined): { href: string; label: string } {
  const isInterno = !!voltar && voltar.startsWith("/") && !voltar.startsWith("//");
  if (!isInterno) return { href: "/portal/avaliacoes", label: "Voltar" };

  const caminho = voltar as string;
  if (caminho.startsWith("/escola/") || caminho.startsWith("/cursos/")) {
    return { href: caminho, label: "Voltar à sala de aula" };
  }
  return { href: caminho, label: "Voltar" };
}

export default async function AvaliacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, voltar } = await searchParams;
  const { href: voltarHref, label: voltarLabel } = resolveVoltarHref(voltar);

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
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {voltarLabel}
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
              {avaliacao.tipo === "PROVA" && (
                <p className={`text-sm font-bold ${avaliacao.aprovado ? "text-iw-success" : "text-iw-error"}`}>
                  {avaliacao.aprovado ? "Aprovado" : "Reprovado"} (nota mínima 6,0)
                </p>
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
                <span>Esta é a sua única tentativa desta prova. Responda com atenção antes de finalizar.</span>
              </div>
            )}

            <form action={submeterAvaliacaoAction} className="space-y-4">
              <input type="hidden" name="avaliacao_id" value={avaliacao.id} />
              {(questoes ?? []).map((q) => {
                const opcoes = q.opcoes as string[];

                if (avaliacao.tipo === "TESTE_LICAO") {
                  return (
                    <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4">
                      <p className="text-sm font-semibold text-iw-navy mb-3">{q.ordem}. {q.enunciado}</p>
                      <div className="flex gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 border-2 border-iw-success/40 bg-iw-success-bg hover:bg-iw-success/15 has-[:checked]:bg-iw-success has-[:checked]:border-iw-success has-[:checked]:text-white text-iw-success font-black text-sm rounded-xl py-2.5 cursor-pointer transition-colors">
                          <input type="radio" name={`questao_${q.id}`} value={0} required className="sr-only" />
                          C — Certo
                        </label>
                        <label className="flex-1 flex items-center justify-center gap-2 border-2 border-iw-error/40 bg-iw-error-bg hover:bg-iw-error/15 has-[:checked]:bg-iw-error has-[:checked]:border-iw-error has-[:checked]:text-white text-iw-error font-black text-sm rounded-xl py-2.5 cursor-pointer transition-colors">
                          <input type="radio" name={`questao_${q.id}`} value={1} required className="sr-only" />
                          E — Errado
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
