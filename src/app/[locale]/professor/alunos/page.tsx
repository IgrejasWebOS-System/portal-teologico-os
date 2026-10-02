import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { calcularMediaCertificado } from "@/utils/avaliacoes/mediaCertificado";
import { professorBaixarParcelaAction, professorReenviarLinkAlunoAction } from "../actions";
import { type TurmaVinculo } from "../TurmasDoProfessor";
import ProfessorPainel from "../ProfessorPainel";
import LinkSenhaAlunoCard from "../LinkSenhaAlunoCard";

export const metadata = { title: "Meus Alunos — Área do Professor" };

// ============================================================
// /professor/alunos — extraído de page.tsx em 27/09/2026 (Fase 1 do
// Painel do Professor). Mesma lógica de dados que já existia na página
// única antiga (matrículas, avaliações, parcelas, progresso), só sem a
// parte de "Minhas Turmas" (agora em /professor/turmas).
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

export default async function AlunosDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string; novoAlunoId?: string; novoAlunoNome?: string }>;
}) {
  const { msg, error, novoAlunoId, novoAlunoNome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const { data: turmasRaw } = await admin
    .from("professor_turmas")
    .select("id, turno, dia_semana, link_token, link_ativo, course_edition_id, course_editions(nome, classe, courses(title), units(name))")
    .eq("professor_id", professor.id)
    .order("created_at", { ascending: false });

  const turmasDoProfessor: TurmaVinculo[] = (turmasRaw ?? []).map((t) => ({
    id: t.id,
    turno: t.turno,
    dia_semana: t.dia_semana,
    link_token: t.link_token,
    link_ativo: t.link_ativo,
    course_edition_id: t.course_edition_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    course_edition: (Array.isArray(t.course_editions) ? t.course_editions[0] : t.course_editions) as any,
  }));

  const { data: matriculas } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, course_id, course_edition_id, curso_nome_snapshot, matricula, status, data_matricula")
    .eq("professor_id", professor.id)
    .order("curso_nome_snapshot");

  const listaMatriculas = matriculas ?? [];
  const alunoIds = Array.from(new Set(listaMatriculas.map((m) => m.aluno_id)));
  const matriculaIds = listaMatriculas.map((m) => m.id);

  const [alunosRes, avaliacoesRes, contasRes] = await Promise.all([
    alunoIds.length
      ? admin.from("ead_alunos").select("id, user_id, nome_completo, cpf, email, status, convite_status").in("id", alunoIds)
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

  const turmasFiltroOptions = turmasDoProfessor
    .filter((t) => t.course_edition_id)
    .map((t) => ({
      id: t.course_edition_id,
      label: `${t.course_edition?.courses?.title ?? "Curso"} — ${t.course_edition?.nome ?? ""}${
        t.course_edition?.classe ? ` (Classe ${t.course_edition.classe})` : ""
      }`,
    }))
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

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
      courseEditionId: m.course_edition_id,
      alunoId: m.aluno_id,
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
      convitePendente: aluno?.convite_status === "FALHOU",
    };
  });

  return (
    <div>
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

      {novoAlunoId && novoAlunoNome && (
        <LinkSenhaAlunoCard alunoId={novoAlunoId} nome={novoAlunoNome} />
      )}

      {professor.cadastro_publico && turmasDoProfessor.length === 0 && (
        <div className="mb-6 flex flex-col items-center gap-2 bg-amber-50 border border-amber-200 text-black px-4 py-3.5 rounded-xl text-sm text-center">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="uppercase font-bold">
            Você ainda não tem nenhuma turma vinculada — vincule uma em &ldquo;Turmas&rdquo; antes de
            matricular alunos.
          </span>
        </div>
      )}

      <ProfessorPainel
        turmasFiltroOptions={turmasFiltroOptions}
        linhas={linhas}
        baixarParcelaAction={professorBaixarParcelaAction}
        reenviarLinkAction={professorReenviarLinkAlunoAction}
      />
    </div>
  );
}
