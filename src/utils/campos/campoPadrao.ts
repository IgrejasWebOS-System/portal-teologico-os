// ============================================================
// Campo/Ministério padrão — decisão do Joaquim em 13/09/2026: toda
// caixa de seleção de "Campo / Ministério" (inscrição pública, nova
// matrícula direta, ficha rápida, auto-matrícula do aluno, edição de
// aluno) deve vir com "Campo Piracicaba Sede" pré-selecionado, em
// vez de começar em branco ("Selecione (opcional)"). A pessoa que está
// preenchendo continua livre pra trocar pra outro campo/ministério —
// isso só muda o valor inicial.
// Nome confirmado em ead_campos_ministerios (14/09/2026) — "Campo AD
// Brás Piracicaba" nunca existiu como registro real, por isso o padrão
// não estava caindo em lugar nenhum.
// ============================================================

export const CAMPO_PADRAO_NOME = "Campo Piracicaba Sede";

export function resolverCampoPadraoId(
  campos: { id: string; nome: string }[],
  valorAtual?: string | null
): string {
  // Se já existe um valor real salvo (edição de um aluno já cadastrado
  // em outro campo, por exemplo), respeita ele — o padrão só entra em
  // jogo quando o campo estaria em branco.
  if (valorAtual) return valorAtual;
  return campos.find((c) => c.nome === CAMPO_PADRAO_NOME)?.id ?? "";
}
