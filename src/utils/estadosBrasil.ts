// ============================================================
// Espelho estático (client-safe) da tabela public.estados — 27 UF +
// Região IBGE (Norte/Nordeste/Centro-Oeste/Sudeste/Sul). Fonte oficial:
// IBGE (https://www.ibge.gov.br). Serve pra calcular a Região na hora,
// sem round-trip ao banco, tanto no CampoForm (badge de Região ao
// digitar o CEP) quanto no cartograma de Cobertura Nacional.
// ============================================================

export type RegiaoBR = "NORTE" | "NORDESTE" | "CENTRO-OESTE" | "SUDESTE" | "SUL";

export type EstadoBR = {
  uf: string;
  nome: string;
  regiao: RegiaoBR;
  // Posição aproximada (linha/coluna) num grid esquemático 8x7 do Brasil,
  // só pra desenhar o cartograma — não são coordenadas geográficas reais.
  row: number;
  col: number;
};

export const ESTADOS_BR: EstadoBR[] = [
  { uf: "RR", nome: "Roraima", regiao: "NORTE", row: 0, col: 2 },
  { uf: "AP", nome: "Amapá", regiao: "NORTE", row: 0, col: 4 },
  { uf: "AM", nome: "Amazonas", regiao: "NORTE", row: 1, col: 1 },
  { uf: "PA", nome: "Pará", regiao: "NORTE", row: 1, col: 4 },
  { uf: "AC", nome: "Acre", regiao: "NORTE", row: 2, col: 0 },
  { uf: "RO", nome: "Rondônia", regiao: "NORTE", row: 2, col: 1 },
  { uf: "TO", nome: "Tocantins", regiao: "NORTE", row: 2, col: 4 },
  { uf: "MA", nome: "Maranhão", regiao: "NORDESTE", row: 1, col: 5 },
  { uf: "CE", nome: "Ceará", regiao: "NORDESTE", row: 1, col: 6 },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "NORDESTE", row: 1, col: 7 },
  { uf: "PI", nome: "Piauí", regiao: "NORDESTE", row: 2, col: 5 },
  { uf: "PB", nome: "Paraíba", regiao: "NORDESTE", row: 2, col: 7 },
  { uf: "PE", nome: "Pernambuco", regiao: "NORDESTE", row: 2, col: 6 },
  { uf: "AL", nome: "Alagoas", regiao: "NORDESTE", row: 3, col: 7 },
  { uf: "SE", nome: "Sergipe", regiao: "NORDESTE", row: 3, col: 6 },
  { uf: "BA", nome: "Bahia", regiao: "NORDESTE", row: 3, col: 5 },
  { uf: "MT", nome: "Mato Grosso", regiao: "CENTRO-OESTE", row: 3, col: 2 },
  { uf: "DF", nome: "Distrito Federal", regiao: "CENTRO-OESTE", row: 4, col: 4 },
  { uf: "GO", nome: "Goiás", regiao: "CENTRO-OESTE", row: 4, col: 3 },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "CENTRO-OESTE", row: 4, col: 2 },
  { uf: "MG", nome: "Minas Gerais", regiao: "SUDESTE", row: 4, col: 5 },
  { uf: "ES", nome: "Espírito Santo", regiao: "SUDESTE", row: 4, col: 6 },
  { uf: "SP", nome: "São Paulo", regiao: "SUDESTE", row: 5, col: 3 },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "SUDESTE", row: 5, col: 5 },
  { uf: "PR", nome: "Paraná", regiao: "SUL", row: 5, col: 2 },
  { uf: "SC", nome: "Santa Catarina", regiao: "SUL", row: 6, col: 2 },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "SUL", row: 6, col: 1 },
];

export function regiaoPorUf(uf: string | null | undefined): RegiaoBR | null {
  if (!uf) return null;
  const found = ESTADOS_BR.find((e) => e.uf === uf.toUpperCase());
  return found?.regiao ?? null;
}

export function nomeEstadoPorUf(uf: string | null | undefined): string | null {
  if (!uf) return null;
  const found = ESTADOS_BR.find((e) => e.uf === uf.toUpperCase());
  return found?.nome ?? null;
}

export const REGIOES_BR: RegiaoBR[] = ["NORTE", "NORDESTE", "CENTRO-OESTE", "SUDESTE", "SUL"];
