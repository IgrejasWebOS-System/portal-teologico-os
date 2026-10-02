// ============================================================
// Validação de formato de e-mail — mais estrita que só checar "tem @"
// (usada antes disso em quase todo formulário público do sistema).
// Exige um domínio com extensão válida (ex.: recusa "nome@empresa",
// aceita "nome@empresa.com" ou "nome@empresa.com.br"). Não verifica se o
// domínio existe de fato (isso exigiria uma consulta DNS/MX externa na
// hora do cadastro) — decisão do Joaquim em 18/09/2026: o próprio convite
// por e-mail que a pessoa precisa abrir pra criar senha já é a prova
// definitiva de que o endereço existe; aqui só filtra erro de digitação
// grosseiro antes de gastar um envio de convite.
// ============================================================

const EMAIL_COM_EXTENSAO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function validarEmail(emailRaw: string): boolean {
  const email = emailRaw.trim();
  if (!email) return false;
  return EMAIL_COM_EXTENSAO.test(email);
}
