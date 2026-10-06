// ============================================================
// Validação de CPF (dígitos verificadores) — usada tanto no client
// (feedback imediato no formulário) quanto no server (matricularDiretoAction),
// pra não confiar só na máscara de digitação, que garante formato mas
// não garante que o número é matematicamente válido.
// ============================================================

// ------------------------------------------------------------
// ead_alunos.cpf tem registros nos DOIS formatos (só dígitos e com máscara
// 000.000.000-00) — o índice único comparava texto cru e deixou passar o
// mesmo CPF duas vezes (achado 05/10/2026: ANA PAULA e PEDRO HENRIQUE com
// duas fichas e duas matrículas). Toda busca de aluno por CPF deve usar
// `.in("cpf", cpfVariantes(cpf))` para casar os dois formatos.
// ------------------------------------------------------------
export function cpfVariantes(cpfRaw: string): string[] {
  const d = cpfRaw.replace(/\D/g, "");
  if (d.length !== 11) return [cpfRaw];
  return [d, `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`];
}

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
