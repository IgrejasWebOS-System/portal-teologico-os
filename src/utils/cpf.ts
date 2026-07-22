// ============================================================
// Validação de CPF (dígitos verificadores) — usada tanto no client
// (feedback imediato no formulário) quanto no server (matricularDiretoAction),
// pra não confiar só na máscara de digitação, que garante formato mas
// não garante que o número é matematicamente válido.
// ============================================================

export function validarCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // 000.000.000-00, 111.111.111-11 etc.

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  if (digito1 !== Number(cpf[9])) return false;

  const digito2 = calcularDigito(cpf.slice(0, 10), 11);
  if (digito2 !== Number(cpf[10])) return false;

  return true;
}
