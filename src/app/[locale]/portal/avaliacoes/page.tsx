import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, GraduationCap, AlertTriangle, ListChecks } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { iniciarAvaliacaoAction, iniciarTesteLicaoAction } from "./actions";
import { iniciarTesteLicaoAction as iniciarTesteLicaoMateriaAction } from "../testes/[lessonId]/actions";
import { listarTestesLicaoDoCurso, type TesteLicaoDisponivel } from "@/utils/avaliacoes/gerador";
import { TOTAL_TESTES_POR_MATERIA } from "@/utils/avaliacoes/geradorLicao";

// ============================================================
// 26/09/2026, pedido do Joaquim: os "Testes por lição" desta página
// (bloco logo abaixo, "Testes por lição (Certo/Errado)") só leem o
// banco ANTIGO (avaliacoes_teste_licao_banco, migration 097 -- hoje só
// tem Pneumatologia/Curso Básico). Desde 11-12/09/2026 existe um banco
// NOVO por matéria (avaliacoes_banco_questoes_licao, migrations
// 099/100 -- Bibliologia e Homilética/Curso Médio), usado até agora só
// dentro da tela da aula (/escola/[id]). Bloco novo abaixo
// ("Testes e Prova por matéria") lê o banco novo e mostra aqui também,
// pra não depender de o aluno estar na aula certa pra achar o teste.
// ============================================================

export const metadata = { title: "Simulados e Provas — Portal do Aluno" };

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string; voltar?: string }>;
}

function resolveVoltarHref(voltar: string | undefined): string {
  const isPathInterno =
    !!voltar &&
    voltar.startsWith("/") &&
    !voltar.startsWith("//") &&
    (voltar.startsWith("/escola/") || voltar.startsWith("/cursos/"));

  return isPathInterno ? (voltar as string) : "/portal";
}

const STATUS_MATRICULA_LABEL: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  CANCELADO: "Cancelado",
};

export default async function AvaliacoesPage({ searchParams }: PageProps) {
  const { msg, error, voltar } = await searchParams;
  const voltarHref = resolveVoltarHref(voltar);
  // 28/09/2026, achado do Joaquim: os links pra dentro de um teste/prova
  // (linhas abaixo) reusavam `voltarHref` — que é o destino de ONDE esta
  // página veio (escola/cursos), não "volte pra cá". Resultado: ao
  // terminar um teste e clicar Voltar, pulava direto pra tela de aula,
  // sem passar por "Simulados e Provas". Os links filhos agora apontam de
  // volta pra esta própria página (preservando o `voltar` que ela recebeu,
  // pra continuar voltando em cadeia se o aluno clicar Voltar de novo lá).
  const voltarParaAvaliacoes = `/portal/avaliacoes?voltar=${encodeURIComponent(voltarHref)}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!aluno) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center justify-center px-8">
        <div className="max-w-md bg-iw-surface border border-iw-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <p className="text-iw-muted text-sm">
            Você ainda não tem uma matrícula ativa como aluno do CETADP.
          </p>
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLTAR
          </Link>
        </div>
      </div>
    );
  }

  const { data: matriculas } = await supabase
    .from("ead_matriculas")
    .select("id, curso_nome_snapshot, course_id, status, nota_final")
    .eq("aluno_id", aluno.id)
    .order("data_matricula", { ascending: false });

  const matriculaIds = (matriculas ?? []).map((m) => m.id);
  const courseIds = [...new Set((matriculas ?? []).map((m) => m.course_id).filter(Boolean))] as string[];

  const { data: avaliacoes } = matriculaIds.length
    ? await supabase
        .from("avaliacoes")
        .select("id, matricula_id, tipo, status, nota, aprovado, lesson_id, numero_teste, iniciada_em, finalizada_em")
        .in("matricula_id", matriculaIds)
        .order("iniciada_em", { ascending: false })
    : { data: [] };

  const testesLicaoPorCurso = new Map<string, TesteLicaoDisponivel[]>();
  for (const courseId of courseIds) {
    testesLicaoPorCurso.set(courseId, await listarTestesLicaoDoCurso(courseId));
  }

  // Banco NOVO por matéria (avaliacoes_banco_questoes_licao) -- só staff
  // consegue ler essa tabela via RLS, por isso admin client aqui.
  const materiasComBancoPorCurso = new Map<string, { lessonId: string; lessonTitle: string }[]>();
  if (courseIds.length) {
    const admin = createAdminClient();
    const { data: lessonsTodas } = await admin
      .from("lessons")
      .select("id, title, course_id")
      .in("course_id", courseIds);

    const lessonIds = (lessonsTodas ?? []).map((l) => l.id);
    const { data: bancoRows } = lessonIds.length
      ? await admin
          .from("avaliacoes_banco_questoes_licao")
          .select("lesson_id")
          .in("lesson_id", lessonIds)
          .eq("ativo", true)
      : { data: [] };

    const lessonIdsComBanco = new Set((bancoRows ?? []).map((b) => b.lesson_id));

    for (const lesson of lessonsTodas ?? []) {
      if (!lessonIdsComBanco.has(lesson.id)) continue;
      const lista = materiasComBancoPorCurso.get(lesson.course_id) ?? [];
      lista.push({ lessonId: lesson.id, lessonTitle: lesson.title });
      materiasComBancoPorCurso.set(lesson.course_id, lista);
    }
  }

  const { data: enrollments } = courseIds.length
    ? await supabase
        .from("enrollments")
        .select("course_id, progress_percent")
        .eq("user_id", user.id)
        .in("course_id", courseIds)
    : { data: [] };

  const progressoPorCurso = new Map(
    (enrollments ?? []).map((e) => [e.course_id, e.progress_percent])
  );

  const LIMITE_SIMULADOS = 2;

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLTAR
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Simulados e Provas</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              O simulado é opcional, com até 2 tentativas por curso. A prova libera ao concluir 100% das aulas e só pode ser feita uma vez.
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

        {(!matriculas || matriculas.length === 0) ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm">Você ainda não tem nenhuma matrícula.</p>
          </div>
        ) : (
          matriculas.map((m) => {
            const avaliacoesDaMatricula = (avaliacoes ?? []).filter((a) => a.matricula_id === m.id);
            const provaExistente = avaliacoesDaMatricula.find((a) => a.tipo === "PROVA");
            const simuladosFeitos = avaliacoesDaMatricula.filter((a) => a.tipo === "SIMULADO").length;
            const simuladosEsgotados = simuladosFeitos >= LIMITE_SIMULADOS;
            const progresso = m.course_id ? progressoPorCurso.get(m.course_id) ?? 0 : 0;
            const provaLiberada = progresso === 100;
            const matriculaEmAndamento = m.status === "EM_ANDAMENTO";
            const podeAvaliar =
              !!m.course_id && (matriculaEmAndamento || !!provaExistente || simuladosFeitos > 0);
            const testesLicao = m.course_id ? testesLicaoPorCurso.get(m.course_id) ?? [] : [];
            const testesLicaoDaMatricula = avaliacoesDaMatricula.filter((a) => a.tipo === "TESTE_LICAO");
            const materiasComBanco = m.course_id ? materiasComBancoPorCurso.get(m.course_id) ?? [] : [];

            return (
              <div key={m.id} className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-iw-navy" />
                    <p className="font-bold text-iw-navy">{m.curso_nome_snapshot}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-iw-bg border border-iw-border text-iw-muted">
                    {STATUS_MATRICULA_LABEL[m.status] ?? m.status}
                    {m.nota_final != null ? ` · nota ${Number(m.nota_final).toFixed(1)}` : ""}
                  </span>
                </div>

                {!m.course_id && (
                  <p className="text-xs text-iw-muted italic">
                    Este curso ainda não tem avaliações configuradas.
                  </p>
                )}

                {podeAvaliar && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Simulado */}
                    <div className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Simulado</p>
                        <span className="text-[10px] font-bold text-iw-muted">{simuladosFeitos}/{LIMITE_SIMULADOS} usados</span>
                      </div>

                      {avaliacoesDaMatricula.filter((a) => a.tipo === "SIMULADO").length > 0 && (
                        <ul className="space-y-1">
                          {avaliacoesDaMatricula
                            .filter((a) => a.tipo === "SIMULADO")
                            .map((a) => (
                              <li key={a.id}>
                                <Link
                                  href={`/portal/avaliacoes/${a.id}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                                  className="block text-xs font-bold text-iw-navy hover:underline"
                                >
                                  {new Date(a.iniciada_em).toLocaleDateString("pt-BR")} — {a.status === "FINALIZADA" ? `nota ${Number(a.nota).toFixed(1)}` : "em andamento"}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      )}

                      {simuladosEsgotados ? (
                        <p className="text-[11px] text-iw-muted italic">
                          Você já utilizou os {LIMITE_SIMULADOS} simulados disponíveis para este curso.
                        </p>
                      ) : matriculaEmAndamento ? (
                        <form action={iniciarAvaliacaoAction} className="space-y-3">
                          <input type="hidden" name="matricula_id" value={m.id} />
                          <input type="hidden" name="tipo" value="SIMULADO" />
                          <label className="block text-[11px] text-iw-muted">
                            Quantidade de questões
                            <select name="num_questoes" defaultValue="10" className="mt-1 w-full bg-white border border-iw-border rounded-lg px-2.5 py-2 text-sm cursor-pointer">
                              <option value="10">10</option>
                              <option value="15">15</option>
                              <option value="20">20</option>
                            </select>
                          </label>
                          <button type="submit" className="w-full bg-iw-blue hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity">
                            Fazer simulado
                          </button>
                        </form>
                      ) : (
                        <p className="text-[11px] text-iw-muted italic">Matrícula não está mais em andamento.</p>
                      )}
                    </div>

                    {/* Prova */}
                    <div className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Prova (única tentativa)</p>
                      {provaExistente ? (
                        <Link
                          href={`/portal/avaliacoes/${provaExistente.id}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                          className="block text-center text-xs font-bold text-iw-navy hover:underline"
                        >
                          Ver resultado da prova ({provaExistente.status === "FINALIZADA" ? `nota ${Number(provaExistente.nota).toFixed(1)}` : "em andamento"})
                        </Link>
                      ) : !matriculaEmAndamento ? (
                        <p className="text-[11px] text-iw-muted italic">Matrícula não está mais em andamento.</p>
                      ) : !provaLiberada ? (
                        <p className="text-[11px] text-iw-muted italic">
                          Disponível ao concluir 100% das aulas ({progresso}% concluído).
                        </p>
                      ) : (
                        <form action={iniciarAvaliacaoAction} className="space-y-2">
                          <input type="hidden" name="matricula_id" value={m.id} />
                          <input type="hidden" name="tipo" value="PROVA" />
                          <label className="flex items-start gap-2 text-[11px] text-iw-muted leading-snug">
                            <input type="checkbox" name="confirmo_prova" className="mt-0.5" required />
                            <span className="inline-flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 text-iw-warning shrink-0 mt-0.5" />
                              Estou ciente de que, a partir do início, não poderei desistir e só terei esta tentativa.
                            </span>
                          </label>
                          <button type="submit" className="w-full bg-[#E88D0C] hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity border border-black">
                            Iniciar prova
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {matriculaEmAndamento && testesLicao.length > 0 && (
                  <div className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-iw-navy" />
                      <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Testes por lição (Certo/Errado)</p>
                    </div>
                    <ul className="space-y-2">
                      {testesLicao.map((t) => {
                        const tentativa = testesLicaoDaMatricula.find(
                          (a) => a.lesson_id === t.lessonId && a.numero_teste === t.numeroTeste
                        );
                        return (
                          <li
                            key={`${t.lessonId}-${t.numeroTeste}`}
                            className="flex items-center justify-between gap-3 bg-white border border-iw-border rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-iw-navy truncate">
                                {t.lessonTitle} — Teste {t.numeroTeste}
                              </p>
                              <p className="text-[11px] text-iw-muted">
                                {t.licoesLabel} · {t.totalQuestoes} questões
                                {t.gabaritoProvisorio && (
                                  <span className="text-iw-warning font-semibold"> · gabarito provisório</span>
                                )}
                              </p>
                            </div>
                            {tentativa ? (
                              <Link
                                href={`/portal/avaliacoes/${tentativa.id}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                                className="shrink-0 text-[11px] font-bold text-iw-navy hover:underline"
                              >
                                {tentativa.status === "FINALIZADA" ? `nota ${Number(tentativa.nota).toFixed(1)}` : "em andamento"}
                              </Link>
                            ) : (
                              <form action={iniciarTesteLicaoAction}>
                                <input type="hidden" name="matricula_id" value={m.id} />
                                <input type="hidden" name="lesson_id" value={t.lessonId} />
                                <input type="hidden" name="numero_teste" value={t.numeroTeste} />
                                <button
                                  type="submit"
                                  className="shrink-0 bg-iw-blue hover:opacity-90 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-opacity"
                                >
                                  Fazer teste
                                </button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {matriculaEmAndamento && materiasComBanco.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-iw-navy" />
                      <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Testes e Prova por matéria</p>
                    </div>
                    {materiasComBanco.map((materia) => {
                      const avaliacoesDaMateria = avaliacoesDaMatricula.filter((a) => a.lesson_id === materia.lessonId);
                      const testesResumo = Array.from({ length: TOTAL_TESTES_POR_MATERIA }, (_, i) => i + 1).map((numero) => ({
                        numero,
                        avaliacao: avaliacoesDaMateria.find((a) => a.tipo === "TESTE_LICAO" && a.numero_teste === numero),
                      }));
                      const provaDaMateria = avaliacoesDaMateria.find((a) => a.tipo === "PROVA");
                      return (
                        <div key={materia.lessonId} className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                          <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">{materia.lessonTitle}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {testesResumo.map(({ numero, avaliacao }) => (
                              <div key={numero} className="bg-white border border-iw-border rounded-lg p-3 space-y-2 text-center">
                                <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Teste {numero}</p>
                                {avaliacao ? (
                                  <Link
                                    href={`/portal/testes/${materia.lessonId}/${avaliacao.id}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                                    className="block text-[11px] font-bold text-iw-navy hover:underline"
                                  >
                                    {avaliacao.status === "FINALIZADA" ? `Nota ${Number(avaliacao.nota).toFixed(1)}` : "Continuar"}
                                  </Link>
                                ) : (
                                  <form action={iniciarTesteLicaoMateriaAction}>
                                    <input type="hidden" name="lesson_id" value={materia.lessonId} />
                                    <input type="hidden" name="tipo" value="TESTE_LICAO" />
                                    <input type="hidden" name="numero_teste" value={numero} />
                                    <button
                                      type="submit"
                                      className="w-full bg-iw-blue hover:opacity-90 text-white font-bold text-[11px] px-2 py-1.5 rounded-lg transition-opacity"
                                    >
                                      Fazer
                                    </button>
                                  </form>
                                )}
                              </div>
                            ))}

                            <div className="bg-white border border-iw-border rounded-lg p-3 space-y-2 text-center">
                              <p className="text-[10.5px] font-bold text-iw-navy uppercase tracking-wider">Prova</p>
                              {provaDaMateria ? (
                                <Link
                                  href={`/portal/testes/${materia.lessonId}/${provaDaMateria.id}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                                  className="block text-[11px] font-bold text-iw-navy hover:underline"
                                >
                                  {provaDaMateria.status === "FINALIZADA" ? `Nota ${Number(provaDaMateria.nota).toFixed(1)}` : "Continuar"}
                                </Link>
                              ) : (
                                <Link
                                  href={`/portal/testes/${materia.lessonId}?voltar=${encodeURIComponent(voltarParaAvaliacoes)}`}
                                  className="block text-[11px] font-bold text-iw-navy hover:underline"
                                >
                                  Iniciar
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
