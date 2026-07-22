// ============================================================
// Catálogo único das opções de "curso pretendido" do formulário
// público de inscrição (/inscricao) — fonte da verdade para não
// duplicar labels em 3 lugares (form público, painel da secretaria
// e a cobrança de matrícula via Mercado Pago).
//
// precoMatriculaCentavos > 0 → a matrícula passa a ser cobrada de
// verdade no ato da inscrição (decisão do CETADP, 14/07/2026), antes
// da análise da secretaria. 0 → continua no fluxo gratuito/manual de
// sempre (secretaria aprova direto, sem cobrança).
//
// Valores reais confirmados na apresentação institucional (PDF
// 03/04/25): Curso Teológico Básico = matrícula R$25,00. Curso
// Teológico Médio = sem matrícula. Os demais (Oficial genérico,
// Reciclagem, Avançado, Preparatório) ainda não têm preço definido
// pela instituição — ficam de fora da cobrança até essa decisão.
// ============================================================

export interface OpcaoCurso {
  value: string;
  label: string;
  precoMatriculaCentavos: number;
}

export const CURSOS_EAD: OpcaoCurso[] = [
  { value: "OFICIAL", label: "Curso Oficial", precoMatriculaCentavos: 0 },
  { value: "RECICLAGEM", label: "Curso de Reciclagem", precoMatriculaCentavos: 0 },
  { value: "TEOLOGIA_BASICO", label: "Teologia — Nível Básico", precoMatriculaCentavos: 2500 },
  { value: "TEOLOGIA_MEDIO", label: "Teologia — Nível Médio", precoMatriculaCentavos: 0 },
  { value: "TEOLOGIA_AVANCADO", label: "Teologia — Nível Avançado", precoMatriculaCentavos: 0 },
  { value: "TREINAMENTO", label: "Preparatório / Capacitação", precoMatriculaCentavos: 0 },
];

export function labelCurso(value: string): string {
  return CURSOS_EAD.find((c) => c.value === value)?.label ?? value;
}

export function precoMatriculaCentavos(value: string): number {
  return CURSOS_EAD.find((c) => c.value === value)?.precoMatriculaCentavos ?? 0;
}
