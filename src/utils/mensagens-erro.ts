// ============================================================
// Traduz mensagens de erro técnicas (Supabase Auth, rede, Postgres) para
// português do Brasil, para nunca mostrar texto em inglês ao usuário.
// Pedido do Joaquim (05/10/2026): "todas as mensagens devem vir em
// português Brasil, mesmo as mensagens de erro tradicionais".
// Se nenhuma regra casar, devolve uma mensagem genérica em português —
// o texto original continua só no console.error do servidor.
// ============================================================

const REGRAS: { teste: RegExp; texto: string }[] = [
  { teste: /rate limit|too many requests|over_email_send_rate_limit|email rate/i, texto: "Muitos e-mails foram enviados em pouco tempo. Aguarde alguns minutos e tente novamente." },
  { teste: /invalid.*email|email.*invalid|unable to validate email/i, texto: "O e-mail cadastrado parece inválido. Corrija o e-mail na ficha e tente de novo." },
  { teste: /already.*(registered|exists)|user.*already/i, texto: "Este e-mail já possui um acesso cadastrado." },
  { teste: /error sending|sending.*email|smtp|mail.*(fail|error)|failed to send/i, texto: "O sistema não conseguiu enviar o e-mail agora. Tente novamente em alguns minutos." },
  { teste: /different from the old password|same.*password/i, texto: "A nova senha precisa ser diferente da senha anterior." },
  { teste: /password should be at least|password.*(weak|short)|weak password/i, texto: "A senha é fraca ou curta demais. Use ao menos 8 caracteres, com letra maiúscula, minúscula e número." },
  { teste: /auth session missing|session.*(missing|expired)|jwt expired/i, texto: "Sua sessão expirou. Entre novamente pelo link do e-mail ou pela tela de login." },
  { teste: /user not found|not found/i, texto: "Usuário não encontrado." },
  { teste: /signups? not allowed|not allowed/i, texto: "Não foi possível criar o acesso para este e-mail." },
  { teste: /network|fetch failed|timeout|timed out|econn/i, texto: "Falha de conexão. Verifique a internet e tente novamente." },
  { teste: /permission denied|row-level security|rls|not authorized|unauthorized|forbidden/i, texto: "Você não tem permissão para executar esta ação." },
  { teste: /duplicate key|already exists|unique/i, texto: "Já existe um registro com estes dados." },
];

export function traduzirErro(mensagemOriginal: string | null | undefined): string {
  const msg = (mensagemOriginal ?? "").trim();
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";
  for (const r of REGRAS) {
    if (r.teste.test(msg)) return r.texto;
  }
  // Já está em português (começa com letra acentuada/palavra comum)? Mantém.
  if (/[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]/.test(msg) || /^(Erro|Não|Informe|Preencha|Este|Esta|Esse|Essa)\b/.test(msg)) {
    return msg;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
