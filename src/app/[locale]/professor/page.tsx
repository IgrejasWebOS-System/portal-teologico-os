import { redirect } from "next/navigation";
import { GraduationCap, CheckCircle2, Lock, LogOut, UserPlus, Receipt, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { signOutAction } from "@/app/actions";
import { calcularMediaCertificado } from "@/utils/avaliacoes/mediaCertificado";
import Logo from "@/components/Logo";
import { professorBaixarParcelaAction, professorCriarMatriculaAction } from "./actions";
import TurmasDoProfessor, { type TurmaVinculo } from "./TurmasDoProfessor";

export const metadata = { title: "Área do Professor — CETADP" };

// ============================================================
// /professor — Módulo 1 (RBAC "Professor de turma"), 13/09/2026,
// expandido em 14/09/2026: professor "gerencia sua turma" — não só vê,
// também dá baixa em parcela do próprio aluno e matricula aluno novo já
// vinculado a ele (ver actions.ts). Imprimir documento "em nome do
// aluno" fica para depois de padronizar o cabeçalho/rodapé de Impressão
// (pedido do Joaquim em 14/09/2026, ainda aguardando o PDF de
// referência) — mexer nisso agora arriscaria retrabalho.
//
// Escopo decidido pelo schema já existente: ead_matriculas.professor_id
// (migration 044) — o professor vê exatamente os alunos vinculados a
// ele nas matrículas, não "todo mundo do curso".
//
// Decisão de acesso a dado (consistente com as páginas de Impressão do
// aluno): autentica e resolve identidade com o client normal, depois
// lê os dados com o client admin (service_role) já filtrado pelo
// professor_id verificado — mesmo padrão de utils/aluno/matriculaAtiva.ts,
// em vez de escrever policy de RLS nova pra cada tabela envolvida.
// ============================================================

type Parcela = {
  id: string;
  origem_id: string;
  numero_parcela: number;
  total_parcelas: number;
  descricao: string;
  valor_bruto_centavos: number;
  data_vencimento: string;
  status: string;
};

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function AreaDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  // Mutirão de cadastro (18/09/2026): cursos + unidades pro professor
  // criar as próprias turmas, e as turmas que ele já criou (com o link
  // público de cada uma) pra listar/copiar.
  const [{ data: cursosRaw }, { data: unitsRaw }, { data: turmasRaw }] = await Promise.all([
    admin.from("courses").select("id, title").order("title"),
    admin.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
    admin
      .from("professor_turmas")
      .select("id, turno, dia_semana, link_token, link_ativo, course_editions(nome, classe, courses(title), units(name))")
      .eq("professor_id", professor.id)
      .order("created_at", { ascending: false }),
  ]);

  const turmasDoProfessor: TurmaVinculo[] = (turmasRaw ?? []).map((t) => ({
    id: t.id,
    turno: t.turno,
    dia_semana: t.dia_semana,
    link_token: t.link_token,
    link_ativo: t.link_ativo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    course_edition: (Array.isArray(t.course_editions) ? t.course_editions[0] : t.course_editions) as any,
  }));

  const { data: matriculas } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, course_id, curso_nome_snapshot, matricula, status, data_matricula")
    .eq("professor_id", professor.id)
    .order("curso_nome_snapshot");

  const listaMatriculas = matriculas ?? [];
  const alunoIds = Array.from(new Set(listaMatriculas.map((m) => m.aluno_id)));
  const matriculaIds = listaMatriculas.map((m) => m.id);

  const [alunosRes, avaliacoesRes, contasRes] = await Promise.all([
    alunoIds.length
      ? admin.from("ead_alunos").select("id, user_id, nome_completo, cpf, status, convite_status").in("id", alunoIds)
      : Promise.resolve({ data: [] }),
    matriculaIds.length
      ? admin
          .from("avaliacoes")
          .select("matricula_id, tipo, status, nota, lesson_id")
          .in("matricula_id", matriculaIds)
      : Promise.resolve({ data: [] }),
    matriculaIds.length
      ? admin
          .from("fin_contas_receber")
          .select("id, origem_id, numero_parcela, total_parcelas, descricao, valor_bruto_centavos, data_vencimento, status")
          .eq("origem_tipo", "MATRICULA_DIRETA")
          .in("origem_id", matriculaIds)
          .order("numero_parcela")
      : Promise.resolve({ data: [] as Parcela[] }),
  ]);

  const alunoPorId = new Map((alunosRes.data ?? []).map((a) => [a.id, a]));
  const userIds = Array.from(new Set((alunosRes.data ?? []).map((a) => a.user_id).filter(Boolean)));

  const { data: enrollmentsData } = userIds.length
    ? await admin.from("enrollments").select("user_id, course_id, progress_percent").in("user_id", userIds)
    : { data: [] };

  const progressoMap = new Map(
    (enrollmentsData ?? []).map((e) => [`${e.user_id}:${e.course_id}`, e.progress_percent])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avaliacoesPorMatricula = new Map<string, any[]>();
  for (const a of avaliacoesRes.data ?? []) {
    const lista = avaliacoesPorMatricula.get(a.matricula_id) ?? [];
    lista.push(a);
    avaliacoesPorMatricula.set(a.matricula_id, lista);
  }

  const parcelasPorMatricula = new Map<string, Parcela[]>();
  for (const c of (contasRes.data ?? []) as Parcela[]) {
    const lista = parcelasPorMatricula.get(c.origem_id) ?? [];
    lista.push(c);
    parcelasPorMatricula.set(c.origem_id, lista);
  }

  // Cursos que o professor já leciona (pelo que já tem matriculado) —
  // usado pra restringir o <select> de curso da Nova Matrícula.
  const cursosDoProfessor = Array.from(
    new Map(listaMatriculas.map((m) => [m.course_id, m.curso_nome_snapshot])).entries()
  ).filter(([id]) => id);

  const linhas = listaMatriculas.map((m) => {
    const aluno = alunoPorId.get(m.aluno_id);
    const avaliacoesDaMatricula = avaliacoesPorMatricula.get(m.id) ?? [];
    const testesFinalizados = avaliacoesDaMatricula.filter(
      (a) => a.tipo === "TESTE_LICAO" && a.status === "FINALIZADA"
    ).length;
    const media = calcularMediaCertificado(avaliacoesDaMatricula);
    const progresso = aluno?.user_id ? progressoMap.get(`${aluno.user_id}:${m.course_id}`) ?? 0 : 0;
    const parcelasDaMatricula = parcelasPorMatricula.get(m.id) ?? [];
    const parcelas = {
      pagas: parcelasDaMatricula.filter((p) => p.status === "PAGO").length,
      total: parcelasDaMatricula.length,
      lista: parcelasDaMatricula,
    };

    return {
      matriculaId: m.id,
      nome: aluno?.nome_completo ?? "—",
      cpf: aluno?.cpf ?? null,
      curso: m.curso_nome_snapshot,
      numeroMatricula: m.matricula,
      status: m.status,
      dataMatricula: m.data_matricula,
      progresso,
      testesFinalizados,
      media,
      parcelas,
      // Mutirão de cadastro (18/09/2026): quando o convite de acesso do
      // aluno falhou, avisa o professor aqui -- o jeito de reenviar é o
      // próprio aluno reabrir o link da turma e preencher de novo com o
      // mesmo CPF (matricularAlunoEmCurso detecta e só reenvia o convite,
      // sem duplicar a matrícula).
      convitePendente: aluno?.convite_status === "FALHOU",
    };
  });

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" variant="light" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none truncate">CETADP</p>
              <p className="text-iw-sky/60 text-xs truncate">Área do Professor</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <p className="text-white text-sm font-medium hidden sm:block">{professor.nome_completo}</p>
            <form action={signOutAction}>
              <input type="hidden" name="locale" value="pt-BR" />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-sky/80 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {msg && (
          <div className="mb-6 flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="mb-8">
          <TurmasDoProfessor
            cursos={cursosRaw ?? []}
            units={(unitsRaw ?? []) as { id: string; type: string; name: string; parent_id: string | null }[]}
            turmas={turmasDoProfessor}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
          />
        </div>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-iw-navy">Meus alunos</h1>
            <p className="text-iw-muted text-sm mt-1">
              {linhas.length} aluno{linhas.length === 1 ? "" : "s"} vinculado{linhas.length === 1 ? "" : "s"} a você.
            </p>
          </div>

          {cursosDoProfessor.length > 0 && (
            <details className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-iw-navy">
                <UserPlus className="w-4 h-4 text-iw-gold" /> Nova Matrícula
              </summary>
              <form action={professorCriarMatriculaAction} className="p-4 pt-0 space-y-3 w-80">
                <div>
                  <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1">
                    Nome completo
                  </label>
                  <input
                    name="nome_completo"
                    required
                    className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1">CPF</label>
                  <input
                    name="cpf"
                    className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    name="telefone"
                    className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1">
                    Curso
                  </label>
                  <select
                    name="course_id"
                    required
                    className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none"
                  >
                    {cursosDoProfessor.map(([id, nome]) => (
                      <option key={id} value={id ?? ""}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-iw-blue hover:bg-iw-navy text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  Matricular
                </button>
              </form>
            </details>
          )}
        </div>

        {linhas.length === 0 ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <GraduationCap className="w-8 h-8 text-iw-muted/40 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">Nenhum aluno vinculado a você ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linhas.map((l) => (
              <div key={l.matriculaId} className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-iw-navy truncate">{l.nome}</p>
                    <p className="text-xs text-iw-muted truncate">
                      {l.curso} · Matrícula {l.numeroMatricula}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#0D0D0D] text-iw-navy border border-[#CF8403] shrink-0">
                    {l.status}
                  </span>
                </div>

                {l.convitePendente && (
                  <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] px-2.5 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      O e-mail de acesso deste aluno não foi entregue. Peça pra ele reabrir o link da
                      turma e preencher de novo com o mesmo CPF — o convite é reenviado automaticamente.
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-iw-muted">Progresso do curso</span>
                    <span className="font-bold text-iw-navy">{l.progresso}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-iw-bg overflow-hidden">
                    <div className="h-full rounded-full bg-iw-blue" style={{ width: `${l.progresso}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-iw-muted">Testes finalizados</p>
                    <p className="font-bold text-iw-navy">{l.testesFinalizados}</p>
                  </div>
                  <div>
                    <p className="text-iw-muted">Parcelas pagas</p>
                    <p className="font-bold text-iw-navy">
                      {l.parcelas.pagas}/{l.parcelas.total || "—"}
                    </p>
                  </div>
                </div>

                {l.parcelas.lista.length > 0 && (
                  <details className="text-xs border-t border-iw-border pt-2">
                    <summary className="cursor-pointer list-none flex items-center gap-1.5 font-bold text-iw-navy">
                      <Receipt className="w-3.5 h-3.5 text-iw-gold" /> Ver parcelas
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {l.parcelas.lista.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 bg-iw-bg rounded-lg px-2.5 py-1.5">
                          <span className="text-iw-navy truncate">
                            {p.numero_parcela}/{p.total_parcelas} — {fmtMoeda(p.valor_bruto_centavos)} — vence{" "}
                            {fmtData(p.data_vencimento)}
                          </span>
                          {p.status === "PAGO" ? (
                            <span className="text-iw-success font-bold shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Paga
                            </span>
                          ) : (
                            <form action={professorBaixarParcelaAction} className="flex items-center gap-1 shrink-0">
                              <input type="hidden" name="id" value={p.id} />
                              <select
                                name="forma_pagamento"
                                className="bg-white border border-iw-border rounded-md px-1.5 py-1 text-[11px]"
                                defaultValue="PIX"
                              >
                                <option value="PIX">Pix</option>
                                <option value="CARTAO">Cartão</option>
                                <option value="BOLETO">Boleto</option>
                                <option value="TRANSFERENCIA">Transferência</option>
                              </select>
                              <button
                                type="submit"
                                className="bg-iw-blue hover:bg-iw-navy text-white font-bold px-2 py-1 rounded-md text-[11px] transition-colors"
                              >
                                Dar baixa
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-iw-border text-xs">
                  {l.media.quantidade === 0 ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-iw-muted/50" />
                      <span className="text-iw-muted">Sem avaliação finalizada ainda</span>
                    </>
                  ) : l.media.aprovado ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-iw-success" />
                      <span className="text-iw-success font-semibold">
                        Apto ao certificado (média {l.media.media?.toFixed(1)})
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-iw-error/60" />
                      <span className="text-iw-error font-semibold">
                        Abaixo do mínimo (média {l.media.media?.toFixed(1)})
                      </span>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-iw-muted/60">Matriculado em {fmtData(l.dataMatricula)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
