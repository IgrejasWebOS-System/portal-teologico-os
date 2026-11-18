// Busca TODAS as linhas de uma consulta do Supabase, de 1000 em 1000.
// O Supabase corta qualquer consulta em 1000 linhas por padrao; sem paginar,
// telas que somam/contam a tabela inteira (ex.: Dashboard) ficam com numeros
// parciais. Use sempre com `.order("id")` (ou outra ordem estavel) na consulta,
// para as paginas nao se repetirem nem pularem linhas.
export async function buscarTudo<T>(
  fabrica: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; de < 200000; de += 1000) {
    const { data } = await fabrica(de, de + 999);
    const lote = data ?? [];
    tudo.push(...lote);
    if (lote.length < 1000) break;
  }
  return tudo;
}
