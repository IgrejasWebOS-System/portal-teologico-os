// ============================================================
// checkIsProfessor — Módulo 1 (RBAC "Professor de turma"), 13/09/2026.
// Professor NÃO é staff (não deve ver o módulo Admin inteiro) — é um
// papel à parte, escopado só aos próprios alunos (ead_matriculas.
// professor_id). `professores.user_id` (migration 101) é a ponte entre
// o login e o cadastro descritivo que já existia.
//
// `supabase` tipado `any` de propósito — mesmo motivo do comentário em
// utils/staff.ts ("Type instantiation is excessively deep").
// ============================================================

export interface ProfessorLogado {
  id: string;
  nome_completo: string;
  // Campos abaixo (mutirão de cadastro, 18/09/2026) só existem pra
  // resolverGateCompletarCadastro() decidir se a ficha está completa --
  // os outros chamadores (checkIsProfessor usado só pra saber "é
  // professor?") ignoram e continuam funcionando normalmente.
  cadastro_publico: boolean;
  telefone: string | null;
  cpf: string | null;
  cargo: string | null;
  unit_id: string | null;
  // 27/09/2026, Fase 2 do Painel do Professor (Caixa do núcleo) — precisa
  // saber a qual igreja a despesa lançada pertence, pra staff conseguir
  // filtrar por unidade (ver nucleo_despesas_staff_select, migration 115).
  church_id: string | null;
  // 27/09/2026, achado em teste (Joaquim: "Configurações" não mostrava
  // e-mail/igreja/setor) — campos adicionais só de leitura, pra completar
  // a tela sem precisar de uma query extra em cada consumidor.
  sector_id: string | null;
  email: string | null;
  foto_url: string | null;
  // 29/09/2026, pedido do Joaquim: professor passou a editar a ficha
  // completa em /professor/configuracoes (mesmos campos que a secretaria
  // já editava) — precisam vir aqui pra pré-preencher o formulário.
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
}

const FICHA_COMPLETA_SELECT =
  "id, nome_completo, cadastro_publico, telefone, cpf, cargo, unit_id, church_id, sector_id, email, foto_url, " +
  "rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao, " +
  "naturalidade_cidade, naturalidade_estado, nome_conjuge, nome_mae, nome_pai, cep, endereco, " +
  "endereco_numero, endereco_complemento, bairro, cidade, estado";

export async function checkIsProfessor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<ProfessorLogado | null> {
  const { data } = await supabase
    .from("professores")
    .select(FICHA_COMPLETA_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}
