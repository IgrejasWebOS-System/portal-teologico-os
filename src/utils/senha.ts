// ============================================================
// Padrão de senha do sistema (definido com o Joaquim em 18/09/2026):
// mínimo 8 caracteres, com letra maiúscula, letra minúscula e número.
// Vale para /definir-senha (primeiro acesso via convite) e /trocar-senha
// (troca obrigatória de senha temporária, M9b) -- os dois únicos lugares
// onde a pessoa define a PRÓPRIA senha pela primeira vez. Não se aplica
// (ainda) a /cadastro nem à troca de senha dentro do painel do aluno
// (components/aluno/AreaDoAlunoPainel.tsx) -- ver observação no chat.
// ============================================================

export const REGRA_SENHA_TEXTO =
  "Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.";

export function validarSenha(senhaRaw: string): { valido: boolean; mensagem: string } {
  const senha = senhaRaw ?? "";

  if (senha.length < 8) {
    return { valido: false, mensagem: "A senha deve ter no mínimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(senha)) {
    return { valido: false, mensagem: "A senha deve ter pelo menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(senha)) {
    return { valido: false, mensagem: "A senha deve ter pelo menos uma letra minúscula." };
  }
  if (!/[0-9]/.test(senha)) {
    return { valido: false, mensagem: "A senha deve ter pelo menos um número." };
  }

  return { valido: true, mensagem: "" };
}
