import { redirect } from "next/navigation";
import { CheckCircle2, LogOut, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { signOutAction } from "@/app/actions";
import { calcularMediaCertificado } from "@/utils/avaliacoes/mediaCertificado";
import Logo from "@/components/Logo";
import { professorBaixarParcelaAction, professorCriarMatriculaAction } from "./actions";
import { type TurmaVinculo } from "./TurmasDoProfessor";
import ProfessorNovaMatriculaForm from "./ProfessorNovaMatriculaForm";
import ProfessorPainel from "./ProfessorPainel";

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
  const [{ data: cursosRaw }, { data: unitsRaw }, { data: turmasRaw }, { data: profissoesRaw }] = await Promise.all([
    admin.from("courses").select("id, title").order("title"),
    admin.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
    admin
      .from("professor_turmas")
      .select("id, turno, dia_semana, link_token, link_ativo, course_edition_id, course_editions(nome, classe, courses(title), units(name))")
      .eq("professor_id", professor.id)
      .order("created_at", { ascending: false }),
    admin.from("settings_professions").select("id, name").order("name"),
  ]);

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

  // 22/09/2026, achado em teste (Joaquim): a Nova Matrícula usava esta lista
  // (derivada de ead_matriculas já existentes) pra restringir o <select> de
  // curso — só que isso deixa o professor sem NENHUMA opção quando ele acaba
  // de se vincular a uma turma nova (ex.: 2027) e ainda não tem nenhum aluno
  // nela. Removida em favor de turmasFiltroOptions (abaixo), que vem de
  // professor_turmas — a turma vinculada existe assim que o professor se
  // vincula a ela (Módulo 3), independente de já ter aluno ou não.

  // 21/09/2026, pedido do Joaquim (imagem 8): filtro "por turmas ou
  // todas" em Meus Alunos. A turma de cada matrícula é o
  // course_edition_id (migration 044) — mesma chave que já identifica
  // cada linha de "Minhas Turmas" acima, então dá pra filtrar os alunos
  // por qual turma-vínculo eles pertencem sem tabela nova.
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

        {professor.cadastro_publico && turmasDoProfessor.length === 0 && (
          <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Você ainda não cadastrou nenhuma turma. Sem ao menos uma turma, o sistema não tem como
              gerar o link de matrícula para seus alunos — cadastre a primeira abaixo.
            </span>
          </div>
        )}

        <ProfessorPainel
          cursos={cursosRaw ?? []}
          units={(unitsRaw ?? []) as { id: string; type: string; name: string; parent_id: string | null }[]}
          turmas={turmasDoProfessor}
          appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
          turmasFiltroOptions={turmasFiltroOptions}
          linhas={linhas}
          novaMatriculaSlot={
            turmasFiltroOptions.length > 0 ? (
              <ProfessorNovaMatriculaForm
                action={professorCriarMatriculaAction}
                turmasDoProfessor={turmasFiltroOptions}
                profissoes={profissoesRaw ?? []}
              />
            ) : null
          }
          baixarParcelaAction={professorBaixarParcelaAction}
        />
      </main>
    </div>
  );
}
