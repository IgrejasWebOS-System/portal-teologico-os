// ============================================================
// Agrega uma lista de datas (ou datas + valor) em baldes mensais,
// sempre retornando os últimos `meses` meses (incluindo os que
// tiveram zero ocorrências, pra não quebrar o eixo do gráfico).
// ============================================================

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface BaldeMensal {
  chave: string; // "2026-07"
  label: string; // "Jul/26"
  value: number;
}

/** Gera os últimos `meses` baldes (mais antigo → mais recente), todos com value=0. */
function baldesVazios(meses: number): BaldeMensal[] {
  const hoje = new Date();
  const baldes: BaldeMensal[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    baldes.push({ chave, label, value: 0 });
  }
  return baldes;
}

/** Soma um valor por mês de um ANO CIVIL (Jan–Dez), incluindo meses sem valor. */
export function somarPorMesDoAno(
  itens: { data: string | null | undefined; valor: number }[],
  ano: number
): BaldeMensal[] {
  const baldes: BaldeMensal[] = MESES_ABREV.map((nome, m) => ({
    chave: `${ano}-${String(m + 1).padStart(2, "0")}`,
    label: nome,
    value: 0,
  }));
  for (const item of itens) {
    if (!item.data) continue;
    const d = new Date(item.data);
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== ano) continue;
    baldes[d.getMonth()].value += item.valor;
  }
  return baldes;
}

/** Conta ocorrências por DIA de um mês (todos os dias do mês, mesmo com zero). */
export function contarPorDiaDoMes(
  datas: (string | null | undefined)[],
  ano: number,
  mes: number // 0-11
): BaldeMensal[] {
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const baldes: BaldeMensal[] = Array.from({ length: diasNoMes }, (_, i) => ({
    chave: `${ano}-${String(mes + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    label: String(i + 1),
    value: 0,
  }));
  for (const iso of datas) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== ano || d.getMonth() !== mes) continue;
    baldes[d.getDate() - 1].value += 1;
  }
  return baldes;
}

/** Conta quantas datas caem em cada um dos últimos `meses` meses. */
export function contarPorMes(datas: (string | null | undefined)[], meses = 6): BaldeMensal[] {
  const baldes = baldesVazios(meses);
  const indice = new Map(baldes.map((b, i) => [b.chave, i]));

  for (const iso of datas) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const i = indice.get(chave);
    if (i !== undefined) baldes[i].value += 1;
  }

  return baldes;
}

/** Soma um valor numérico (ex: centavos) por mês, para os últimos `meses` meses. */
export function somarPorMes(
  itens: { data: string | null | undefined; valor: number }[],
  meses = 6
): BaldeMensal[] {
  const baldes = baldesVazios(meses);
  const indice = new Map(baldes.map((b, i) => [b.chave, i]));

  for (const item of itens) {
    if (!item.data) continue;
    const d = new Date(item.data);
    if (Number.isNaN(d.getTime())) continue;
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const i = indice.get(chave);
    if (i !== undefined) baldes[i].value += item.valor;
  }

  return baldes;
}
