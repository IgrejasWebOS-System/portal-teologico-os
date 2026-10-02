import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";

// ============================================================
// Resolve a ficha de aluno + matrícula "de referência" do usuário
// logado, pras telas de Impressão (Ficha, Testes, Prova,
// Declaração, Certificado): prioriza matrícula EM_ANDAMENTO mais
// recente; se não houver nenhuma em andamento, cai pra mais
// recente de qualquer status (aluno que já concluiu, por exemplo).
// Retorna null se o usuário não tiver ficha de aluno oficial.
// ============================================================

export interface AlunoFicha {
  id: string;
  user_id: string | null;
  nome_completo: string;
  cpf: string | null;
  email: string;
  telefone: string | null;
  campo_ministerio_nome: string | null;
  status: string;
  // Campos adicionais (24/09/2026, pedido do Joaquim: padronizar a Ficha
  // do Aluno em /portal/impressao/ficha pro mesmo layout da MATRIZ FICHA
  // ALUNO.pdf, que já é o padrão usado em gerarPdfMatricula) — resolver
  // continua compartilhado pelas 6 telas de Impressão, os outros 5 só
  // ignoram esses campos extras.
  rg: string | null;
  rg_orgao_emissor: string | null;
  rg_uf: string | null;
  data_nascimento: string | null;
  genero: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  profissao: string | null;
  naturalidade_cidade: string | null;
  naturalidade_estado: string | null;
  nacionalidade: string | null;
  nome_conjuge: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  cep: string | null;
  endereco: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  foto_url: string | null;
  sector_id: string | null;
  church_id: string | null;
}

export interface MatriculaAtiva {
  id: string;
  course_id: string | null;
  curso_nome_snapshot: string;
  matricula: string;
  status: string;
  data_matricula: string;
  course_edition_id: string | null;
  professor_id: string | null;
}

export async function resolverAlunoEMatricula(
  userId: string
): Promise<{ aluno: AlunoFicha; matricula: MatriculaAtiva | null } | null> {
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select(CAMPOS_ALUNO_FICHA)
    .eq("user_id", userId)
    .maybeSingle();

  if (!aluno) return null;

  return montarAlunoEMatricula(admin, aluno as unknown as AlunoFicha);
}

// ============================================================
// Mesma resolução, mas por ead_alunos.id direto — usada nas telas de
// Impressão quando acessadas pela secretaria via ?alunoId= (staff
// emitindo declaração/certificado/etc. em nome de um aluno que não
// consegue fazer isso sozinho, 15/09/2026). O CALLER (a página) é quem
// precisa confirmar checkIsStaff antes de honrar esse parâmetro — essa
// função não faz nenhuma checagem de permissão sozinha, então nunca deve
// ser chamada direto a partir de um alunoId vindo da URL sem essa
// checagem antes (senão um aluno comum poderia espiar a ficha de outro).
// ============================================================
export async function resolverAlunoEMatriculaPorAlunoId(
  alunoId: string
): Promise<{ aluno: AlunoFicha; matricula: MatriculaAtiva | null } | null> {
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select(CAMPOS_ALUNO_FICHA)
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return null;

  return montarAlunoEMatricula(admin, aluno as unknown as AlunoFicha);
}

const CAMPOS_ALUNO_FICHA =
  "id, user_id, nome_completo, cpf, email, telefone, campo_ministerio_nome, status, rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao, naturalidade_cidade, naturalidade_estado, nacionalidade, nome_conjuge, nome_mae, nome_pai, cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado, foto_url, sector_id, church_id";

// ============================================================
// Ponto único usado pelas 6 telas de /portal/impressao/* — decide se
// resolve a ficha do PRÓPRIO usuário logado (fluxo normal) ou, se veio
// ?alunoId= na URL, a ficha de OUTRO aluno em nome de quem a secretaria
// está agindo (staff emitindo declaração/certificado/ficha/etc. por um
// aluno que não consegue fazer isso sozinho, 15/09/2026 — "acesso só
// senha master staff", já satisfeito estruturalmente pelo checkIsStaff
// abaixo). A checagem de staff SEMPRE roda antes de honrar o parâmetro:
// se quem está logado não é staff, o alunoId da URL é ignorado e cai
// pro fluxo normal — impede um aluno comum de espiar ficha alheia só
// trocando o parâmetro na barra de endereço.
export async function resolverAlunoParaImpressao(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  alunoIdParam: string | undefined
): Promise<{ aluno: AlunoFicha; matricula: MatriculaAtiva | null } | null> {
  if (alunoIdParam) {
    const isStaff = await checkIsStaff(supabase, userId);
    if (isStaff) {
      return resolverAlunoEMatriculaPorAlunoId(alunoIdParam);
    }
  }
  return resolverAlunoEMatricula(userId);
}

async function montarAlunoEMatricula(
  admin: ReturnType<typeof createAdminClient>,
  aluno: AlunoFicha
): Promise<{ aluno: AlunoFicha; matricula: MatriculaAtiva | null }> {
  const { data: matriculas } = await admin
    .from("ead_matriculas")
    .select("id, course_id, curso_nome_snapshot, matricula, status, data_matricula, course_edition_id, professor_id")
    .eq("aluno_id", aluno.id)
    .order("data_matricula", { ascending: false });

  const lista = matriculas ?? [];
  const matricula =
    lista.find((m) => m.status === "EM_ANDAMENTO") ?? lista[0] ?? null;

  return { aluno, matricula };
}
