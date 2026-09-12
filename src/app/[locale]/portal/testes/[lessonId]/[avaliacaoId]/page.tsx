import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { submeterTesteLicaoAction } from "../actions";
import {
  extrairValorOpcao,
  LABEL_CERTO_ERRADO,
  type FormatoQuestaoLicao,
} from "@/utils/avaliacoes/geradorLicao";

export const metadata = { title: "Teste/Prova — Portal do Aluno" };

interface PageProps {
  params: Promise<{ lessonId: string; avaliacaoId: string }>;
  searchParams: Promise<{ error?: string; voltar?: string }>;
}

interface QuestaoLinha {
  id: string;
  ordem: number;
  enunciado: string;
  opcoes: string[] | null;
  formato: FormatoQuestaoLicao;
  resposta_correta: string;
  resposta_aluno: string | null;
  correta: boolean | null;
}

function resolveVoltarHref(voltar: string | undefined, lessonId: string) {
  const isInterno = !!voltar && voltar.startsWith("/") && !voltar.startsWith("//");
  return isInterno ? { href: voltar as string, label: "Voltar" } : { href: `/portal/testes/${lessonId}`, label: "Voltar" };
}

function tituloAvaliacao(tipo: string, numeroTeste: number | null) {
  return tipo === "PROVA" ? "Prova" : `Teste ${numeroTeste ?? ""}`;
}

export default async function TesteLicaoDetailPage({ params, searchParams }: PageProps) {
  const { lessonId, avaliacaoId } = await params;
  const { error, voltar } = await searchParams;
  const { href: voltarHref, label: voltarLabel } = resolveVoltarHref(voltar, lessonId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: avaliacao } = await admin
    .from("avaliacoes")
    .select(
      "id, tipo, numero_teste, status, num_questoes, acertos, nota, aprovado, matricula_id, lesson_id, ead_matriculas(ead_alunos(user_id))"
    )
    .eq("id", avaliacaoId)
    .single();

  const matriculaInfo = avaliacao?.ead_matriculas as unknown as
    | { ead_alunos: { user_id: string | null } | null }
    | null;

  if (!avaliacao || avaliacao.lesson_id !== lessonId || matriculaInfo?.ead_alunos?.user_id !== user.id) {
    notFound();
  }

  const { data: lesson } = await admin.from("lessons").select("title").eq("id", lessonId).maybeSingle();

  const { data: questoesRaw } = await admin
    .from("avaliacao_questoes")
    .select("id, ordem, enunciado, opcoes, formato, resposta_correta, resposta_aluno, correta")
    .eq("avaliacao_id", avaliacaoId)
    .order("ordem");

  const questoes = (questoesRaw ?? []) as unknown as QuestaoLinha[];
  const finalizada = avaliacao.status === "FINALIZADA";
  const titulo = tituloAvaliacao(avaliacao.tipo, avaliacao.numero_teste);

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
            {titulo} — {lesson?.title}
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">{avaliacao.num_questoes} questões.</p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
            {decodeURIComponent(error)}
          </div>
        )}

        {finalizada ? (
          <>
            <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 text-center space-y-2">
              <div
                className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                  avaliacao.aprovado === false ? "bg-iw-error-bg" : "bg-iw-success-bg"
                }`}
              >
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
              {questoes.map((q) => (
                <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4">
                  <p className="text-sm font-semibold text-iw-navy mb-2">
                    {q.ordem}. {q.enunciado}
                  </p>
                  <ResultadoQuestao questao={q} />
                </div>
              ))}
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

            <form action={submeterTesteLicaoAction} className="space-y-4">
              <input type="hidden" name="avaliacao_id" value={avaliacao.id} />
              <input type="hidden" name="lesson_id" value={lessonId} />
              {questoes.map((q) => (
                <div key={q.id} className="bg-iw-surface border border-iw-border rounded-xl p-4">
                  <p className="text-sm font-semibold text-iw-navy mb-3">
                    {q.ordem}. {q.enunciado}
                  </p>
                  <PerguntaFormato questao={q} />
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-[#E88D0C] hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-xl transition-opacity border border-black"
              >
                Finalizar {avaliacao.tipo === "PROVA" ? "prova" : "teste"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

// ── Formulário de resposta, por formato ──
function PerguntaFormato({ questao: q }: { questao: QuestaoLinha }) {
  const name = `questao_${q.id}`;

  if (q.formato === "CERTO_ERRADO") {
    return (
      <div className="flex gap-4">
        {(["C", "E"] as const).map((valor) => (
          <label key={valor} className="flex items-center gap-2 text-sm text-iw-navy cursor-pointer">
            <input type="radio" name={name} value={valor} required />
            {LABEL_CERTO_ERRADO[valor]}
          </label>
        ))}
      </div>
    );
  }

  if (q.formato === "PREENCHER_LACUNA") {
    return (
      <input
        type="text"
        name={name}
        required
        placeholder="Digite a palavra que completa a frase"
        className="w-full bg-white border border-iw-border rounded-lg px-3 py-2 text-sm"
      />
    );
  }

  // MULTIPLA_ESCOLHA (inclui "Sublinhar a palavra correta") e ASSOCIACAO_COLUNAS
  const opcoes = q.opcoes ?? [];
  return (
    <div className="space-y-2">
      {opcoes.map((op, i) => (
        <label key={i} className="flex items-center gap-2 text-sm text-iw-navy cursor-pointer">
          <input type="radio" name={name} value={extrairValorOpcao(op)} required />
          {op}
        </label>
      ))}
    </div>
  );
}

// ── Exibição de resultado (gabarito x resposta do aluno), por formato ──
function ResultadoQuestao({ questao: q }: { questao: QuestaoLinha }) {
  if (q.formato === "CERTO_ERRADO") {
    return (
      <div className="flex gap-4 text-xs">
        {(["C", "E"] as const).map((valor) => {
          const isCorreta = valor === q.resposta_correta;
          const isEscolhida = valor === q.resposta_aluno;
          return (
            <span
              key={valor}
              className={`px-3 py-1.5 rounded-lg border ${
                isCorreta
                  ? "border-iw-success bg-iw-success-bg text-iw-success font-semibold"
                  : isEscolhida
                    ? "border-iw-error bg-iw-error-bg text-iw-error"
                    : "border-iw-border text-iw-muted"
              }`}
            >
              {LABEL_CERTO_ERRADO[valor]}
              {isEscolhida && !isCorreta && " (sua resposta)"}
            </span>
          );
        })}
      </div>
    );
  }

  if (q.formato === "PREENCHER_LACUNA") {
    return (
      <div className="text-xs space-y-1">
        <p className="text-iw-success font-semibold">Resposta correta: {q.resposta_correta}</p>
        {!q.correta && (
          <p className="text-iw-error">Sua resposta: {q.resposta_aluno || "(em branco)"}</p>
        )}
      </div>
    );
  }

  const opcoes = q.opcoes ?? [];
  return (
    <ul className="space-y-1">
      {opcoes.map((op, i) => {
        const valor = extrairValorOpcao(op);
        const isCorreta = valor === q.resposta_correta;
        const isEscolhida = valor === q.resposta_aluno;
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
  );
}
