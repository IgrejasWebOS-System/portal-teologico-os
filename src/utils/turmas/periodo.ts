// ============================================================
// Período padrão de uma turma (09/10/2026, pedido do Joaquim): os cursos do
// CETADP têm 12 meses, então ao informar a data de início a data final é
// preenchida sozinha (início + 12 meses − 1 dia). Continua editável — vai
// existir uma tabela de períodos (compra de livros, férias) mais adiante.
// Compartilhado entre o formulário (client) e as Server Actions (fallback
// quando só a data de início vem preenchida).
// ============================================================

export const DURACAO_PADRAO_MESES = 12;

// "YYYY-MM-DD" -> "YYYY-MM-DD" (início + 12 meses − 1 dia). Retorna "" se a
// data de início for inválida.
export function dataFimPadrao(inicioIso: string, meses: number = DURACAO_PADRAO_MESES): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inicioIso);
  if (!m) return "";
  const [, ano, mes, dia] = m;
  const d = new Date(Date.UTC(Number(ano), Number(mes) - 1 + meses, Number(dia)));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Data de hoje (dia do sistema) no formato "YYYY-MM-DD", no fuso local.
export function hojeIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Ciclos de início de turma (trimestres do ano).
export const CICLOS_TURMA: { value: string; label: string; mes: string }[] = [
  { value: "T1", label: "1º trimestre (janeiro)", mes: "01" },
  { value: "T2", label: "2º trimestre (abril)", mes: "04" },
  { value: "T3", label: "3º trimestre (julho)", mes: "07" },
  { value: "T4", label: "4º trimestre (outubro)", mes: "10" },
];
