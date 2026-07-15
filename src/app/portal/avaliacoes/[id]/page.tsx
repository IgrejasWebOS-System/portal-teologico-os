import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { submeterAvaliacaoAction } from "../actions";

export const metadata = { title: "Avaliação — Portal do Aluno" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function AvaliacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: avaliacao } = await supabase
    .from("avaliacoes")
    .select("id, tipo, status, num_questoes, acertos, nota, aprovado, ead_matriculas(curso_nome_snapshot)")
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
            href="/portal/avaliacoes"
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">
            {avaliacao.tipo === "PROVA" ? "Prova" : "Simulado"} — {matriculaInfo?.curso_nome_snapshot}
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">{avaliacao.num_questoes} questões de múltipla escolha.</p>
        </div>

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
                className="w-full bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-xl transition-opacity"
              >
                Finalizar {avaliacao.tipo === "PROVA" ? "prova" : "simulado"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
