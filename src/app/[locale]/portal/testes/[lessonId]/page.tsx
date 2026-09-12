import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { iniciarTesteLicaoAction } from "./actions";
import { TOTAL_TESTES_POR_MATERIA } from "@/utils/avaliacoes/geradorLicao";

export const metadata = { title: "Testes e Prova — Portal do Aluno" };

interface PageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ msg?: string; error?: string; voltar?: string }>;
}

interface AvaliacaoLinha {
  id: string;
  tipo: string;
  numero_teste: number | null;
  status: string;
  nota: number | null;
  aprovado: boolean | null;
}

function resolveVoltarHref(voltar: string | undefined, courseId: string) {
  const isInterno = !!voltar && voltar.startsWith("/") && !voltar.startsWith("//");
  return isInterno
    ? { href: voltar as string, label: "Voltar à sala de aula" }
    : { href: `/escola/${courseId}`, label: "Voltar à sala de aula" };
}

export default async function TestesLicaoPage({ params, searchParams }: PageProps) {
  const { lessonId } = await params;
  const { msg, error, voltar } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();

  const { href: voltarHref, label: voltarLabel } = resolveVoltarHref(voltar, lesson.course_id);

  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let matricula: { id: string; status: string } | null = null;
  let avaliacoes: AvaliacaoLinha[] = [];

  if (aluno) {
    const { data: matriculaRow } = await admin
      .from("ead_matriculas")
      .select("id, status")
      .eq("aluno_id", aluno.id)
      .eq("course_id", lesson.course_id)
      .maybeSingle();
    matricula = matriculaRow;

    if (matricula) {
      const { data: avRows } = await admin
        .from("avaliacoes")
        .select("id, tipo, numero_teste, status, nota, aprovado")
        .eq("matricula_id", matricula.id)
        .eq("lesson_id", lessonId);
      avaliacoes = avRows ?? [];
    }
  }

  const matriculaEmAndamento = matricula?.status === "EM_ANDAMENTO";

  function encontrar(tipo: string, numeroTeste?: number): AvaliacaoLinha | undefined {
    return avaliacoes.find((a) => a.tipo === tipo && (tipo === "PROVA" ? true : a.numero_teste === numeroTeste));
  }

  const testes = Array.from({ length: TOTAL_TESTES_POR_MATERIA }, (_, i) => i + 1).map((numero) => ({
    numero,
    avaliacao: encontrar("TESTE_LICAO", numero),
  }));
  const prova = encontrar("PROVA");

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {voltarLabel}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Testes e Prova — {lesson.title}</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              4 testes parciais (2 lições cada) e uma prova final cumulativa. Cada um tem 20 questões
              sorteadas e só pode ser feito uma vez.
            </p>
          </div>
        </div>

        {msg && (
          <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
            {decodeURIComponent(msg)}
          </div>
        )}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
            {decodeURIComponent(error)}
          </div>
        )}

        {!matricula ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm">Você não tem matrícula no curso desta matéria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {testes.map(({ numero, avaliacao }) => (
              <div key={numero} className="bg-iw-surface border border-iw-border rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Teste {numero}</p>
                {avaliacao ? (
                  <Link
                    href={`/portal/testes/${lessonId}/${avaliacao.id}?voltar=${encodeURIComponent(voltarHref)}`}
                    className="block text-xs font-bold text-iw-navy hover:underline"
                  >
                    {avaliacao.status === "FINALIZADA"
                      ? `Ver resultado — nota ${Number(avaliacao.nota).toFixed(1)}`
                      : "Continuar teste em andamento"}
                  </Link>
                ) : matriculaEmAndamento ? (
                  <form action={iniciarTesteLicaoAction}>
                    <input type="hidden" name="lesson_id" value={lessonId} />
                    <input type="hidden" name="tipo" value="TESTE_LICAO" />
                    <input type="hidden" name="numero_teste" value={numero} />
                    <button
                      type="submit"
                      className="w-full bg-iw-blue hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity"
                    >
                      Fazer Teste {numero}
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-iw-muted italic">Matrícula não está em andamento.</p>
                )}
              </div>
            ))}

            <div className="bg-iw-surface border border-iw-border rounded-2xl p-5 space-y-3 sm:col-span-2">
              <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">
                Prova (cumulativa, única tentativa)
              </p>
              {prova ? (
                <Link
                  href={`/portal/testes/${lessonId}/${prova.id}?voltar=${encodeURIComponent(voltarHref)}`}
                  className="block text-xs font-bold text-iw-navy hover:underline"
                >
                  {prova.status === "FINALIZADA"
                    ? `Ver resultado — nota ${Number(prova.nota).toFixed(1)} · ${
                        prova.aprovado ? "Aprovado" : "Reprovado"
                      }`
                    : "Continuar prova em andamento"}
                </Link>
              ) : matriculaEmAndamento ? (
                <form action={iniciarTesteLicaoAction} className="space-y-2">
                  <input type="hidden" name="lesson_id" value={lessonId} />
                  <input type="hidden" name="tipo" value="PROVA" />
                  <label className="flex items-start gap-2 text-[11px] text-iw-muted leading-snug">
                    <input type="checkbox" name="confirmo_prova" className="mt-0.5" required />
                    <span className="inline-flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-iw-warning shrink-0 mt-0.5" />
                      Estou ciente de que, a partir do início, não poderei desistir e só terei esta tentativa.
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="w-full bg-[#E88D0C] hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity border border-black"
                  >
                    Iniciar prova
                  </button>
                </form>
              ) : (
                <p className="text-[11px] text-iw-muted italic">Matrícula não está em andamento.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
