import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import { professorPrecisaCompletar } from "@/utils/completarCadastro";
import Logo from "@/components/Logo";
import CompletarCadastroProfessorFluxo from "./CompletarCadastroProfessorForm";
import EditarMatriculaForm from "../(admin)/admin/matriculas/[id]/EditarMatriculaForm";
import { salvarFichaAlunoAction } from "./actions";

export const metadata = { title: "Complete seu cadastro — CETADP" };

// ============================================================
// Gate pós-login do mutirão de cadastro — só alcança quem veio de um
// link público (professor por /cadastro-professor, aluno por
// /matricula-turma/[token]) com a ficha ainda incompleta; ver
// utils/completarCadastro.ts pro critério exato e os 3 pontos que
// redirecionam pra cá (loginAction, updateSession, definirSenhaAction).
//
// Quem chega aqui sem precisar (link direto, ficha já completa, ou
// cadastro feito pela secretaria/professor -- nunca passa por este
// gate) é mandado de volta pro destino normal, pra esta rota nunca
// virar um beco sem saída.
//
// 20/09/2026 — professor: a ficha agora é a MESMA tela completa que a
// secretaria usa em "Novo Professor" (ProfessorForm.tsx, modo
// selfService), por isso busca aqui o mesmo conjunto de dados que
// novo/membro/page.tsx e editar/[id]/page.tsx buscam (units de todos os
// tipos, churches, generos, estadosCivis, escolaridades, profissoes,
// cargos) + cursos (pro passo de vínculo de turma).
// ============================================================

const CAMPOS_PROFESSOR =
  "id, unit_id, member_id, matricula, nome_completo, cargo, telefone, cpf, rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao, naturalidade_cidade, naturalidade_estado, nacionalidade, nome_conjuge, nome_mae, nome_pai, cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado";

export default async function CompletarCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professorLogado = await checkIsProfessor(supabase, user.id);

  if (professorLogado) {
    if (!professorPrecisaCompletar(professorLogado)) redirect("/professor");

    const admin = createAdminClient();
    const [
      { data: professor },
      { data: unitsRaw },
      { data: churchesRaw },
      { data: generos },
      { data: estadosCivis },
      { data: escolaridades },
      { data: profissoes },
      { data: cargosRaw },
      { data: cursosRaw },
    ] = await Promise.all([
      admin.from("professores").select(CAMPOS_PROFESSOR).eq("id", professorLogado.id).maybeSingle(),
      admin.from("units").select("id, type, name, parent_id"),
      admin.from("churches").select("id, unit_id"),
      admin.from("settings_gender").select("id, name").order("name"),
      admin.from("settings_civil_status").select("id, name").order("name"),
      admin.from("settings_schooling").select("id, name").order("name"),
      admin.from("settings_professions").select("id, name").order("name"),
      admin.from("ecclesiastical_roles").select("id, name").order("name"),
      admin.from("courses").select("id, title").eq("status", "PUBLISHED").order("title"),
    ]);

    if (!professor) redirect("/professor");

    return (
      <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
        {/* 21/09/2026, achado em teste (imagem 8/12/13): a ficha do
            professor usa o mesmo layout em caixas da Nova/Editar
            Matrícula agora, que precisa de mais espaço horizontal do que
            max-w-4xl dava -- senão volta a ficar apertada/fora do padrão. */}
        <div className="w-full max-w-[1400px]">
          <div className="flex justify-center mb-4">
            <Logo size="md" variant="dark" />
          </div>
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">CETADP</p>
            <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1">
              Complete seu cadastro
            </h1>
          </div>

          <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-4 py-3.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
            <p className="text-[#0D0D0D] text-base">
              <span className="font-bold">Cadastro incompleto.</span> O preenchimento integral dos seus
              dados é pré-requisito operacional deste núcleo. Complete a ficha abaixo pra liberar o
              acesso à sua área.
            </p>
          </div>

          <CompletarCadastroProfessorFluxo
            units={unitsRaw ?? []}
            churches={churchesRaw ?? []}
            generos={generos ?? []}
            estadosCivis={estadosCivis ?? []}
            escolaridades={escolaridades ?? []}
            profissoes={profissoes ?? []}
            cargos={cargosRaw ?? []}
            cursos={cursosRaw ?? []}
            existing={{
              id: professor.id,
              unitId: professor.unit_id,
              memberId: professor.member_id,
              matricula: professor.matricula,
              nome: professor.nome_completo,
              cargo: professor.cargo,
              telefone: professor.telefone,
              cpf: professor.cpf,
              rg: professor.rg,
              rgOrgaoEmissor: professor.rg_orgao_emissor,
              rgUf: professor.rg_uf,
              dataNascimento: professor.data_nascimento,
              genero: professor.genero,
              estadoCivil: professor.estado_civil,
              escolaridade: professor.escolaridade,
              profissao: professor.profissao,
              naturalidadeCidade: professor.naturalidade_cidade,
              naturalidadeEstado: professor.naturalidade_estado,
              nacionalidade: professor.nacionalidade,
              nomeConjuge: professor.nome_conjuge,
              nomeMae: professor.nome_mae,
              nomePai: professor.nome_pai,
              cep: professor.cep,
              endereco: professor.endereco,
              enderecoNumero: professor.endereco_numero,
              enderecoComplemento: professor.endereco_complemento,
              bairro: professor.bairro,
              cidade: professor.cidade,
              estado: professor.estado,
            }}
          />
        </div>
      </div>
    );
  }

  // Não é professor -- checa se é aluno vindo de um link de mutirão que
  // ainda não completou a ficha (mesmo critério de
  // resolverGateCompletarCadastro, mas repetido aqui pra já ter os dados
  // completos em mãos e não duplicar a query).
  const admin = createAdminClient();
  const { data: aluno } = await admin.from("ead_alunos").select("*").eq("user_id", user.id).maybeSingle();

  if (!aluno || aluno.data_nascimento) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const { data: matriculaMutirao } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, course_id, curso_nome_snapshot, matricula, status, course_edition_id, professor_id")
    .eq("aluno_id", aluno.id)
    .eq("origem", "MUTIRAO_LINK")
    .limit(1)
    .maybeSingle();

  if (!matriculaMutirao) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  // Nomes de exibição do "Curso e vínculo" (só leitura -- ver comentário
  // em EditarMatriculaForm.tsx sobre selfService): tudo já foi resolvido
  // no momento da matrícula pelo link público (matricular.ts), herdado
  // da turma/professor -- aqui só busca os nomes pra mostrar na ficha.
  const [{ data: turmaRow }, { data: professorRow }, { data: churchRow }, { data: sectorRow }, { data: profissoes }, { data: escolaridades }] = await Promise.all([
    matriculaMutirao.course_edition_id
      ? admin.from("course_editions").select("nome, classe").eq("id", matriculaMutirao.course_edition_id).maybeSingle()
      : Promise.resolve({ data: null }),
    matriculaMutirao.professor_id
      ? admin.from("professores").select("nome_completo").eq("id", matriculaMutirao.professor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    aluno.church_id
      ? admin.from("churches").select("name").eq("id", aluno.church_id).maybeSingle()
      : Promise.resolve({ data: null }),
    aluno.sector_id
      ? admin.from("sectors").select("name").eq("id", aluno.sector_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("settings_professions").select("id, name").order("name"),
    // 21/09/2026, achado em teste (Teste 3, imagens 5/6): faltava aqui —
    // Escolaridade ficava sem nenhuma opção pra buscar.
    admin.from("settings_schooling").select("id, name").order("name"),
  ]);

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[1400px]">
        <div className="flex justify-center mb-4">
          <Logo size="md" variant="dark" />
        </div>

        <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Complete sua ficha pra liberar o acesso ao curso — seus dados de curso/turma já vieram
            preenchidos automaticamente pelo link que você usou.
          </p>
        </div>

        <EditarMatriculaForm
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          matricula={matriculaMutirao as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          aluno={aluno as any}
          campos={[]}
          churches={[]}
          setores={[]}
          turmas={[]}
          professores={[]}
          profissoes={profissoes ?? []}
          escolaridades={escolaridades ?? []}
          pagamentos={[]}
          caixaAbertoId=""
          selfService
          action={salvarFichaAlunoAction}
          turmaNomeExibicao={turmaRow ? `${turmaRow.nome}${turmaRow.classe ? ` - Classe ${turmaRow.classe}` : ""}` : undefined}
          professorNomeExibicao={professorRow?.nome_completo}
          campoNomeExibicao={aluno.campo_ministerio_nome ?? undefined}
          setorNomeExibicao={sectorRow?.name}
          igrejaNomeExibicao={churchRow?.name}
        />
      </div>
    </div>
  );
}
