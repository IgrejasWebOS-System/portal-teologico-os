// ============================================================
// 27/09/2026, achado em teste (Joaquim, /admin/matriculas/nova): digitar
// "TEC" no campo Profissão não encontrava "TÉCNICO..." -- o filtro de
// busca comparava string crua (`label.toLowerCase().startsWith(q)`), e
// "técnico" não começa com "tec" (o "é" não bate com "e"). Isso é
// diferente do <datalist> nativo do navegador (usado em Cidade/
// Naturalidade via useCatalogoCidades.ts), que já tolera acento sozinho
// -- os buscadores "caseiros" em tela cheia/dropdown (SeletorBuscaDropdown
// em BuscaOuCriarInput.tsx, SeletorBuscaTelaCheia em ConfirmarCadastroForm.tsx)
// não tinham esse comportamento embutido, por isso precisam desta função.
//
// normalizarBusca() remove acentos (NFD + strip de combining marks) e
// baixa a caixa, só pra fins de COMPARAÇÃO -- nunca usar o resultado dela
// como valor exibido/gravado, só como chave de busca.
// ============================================================

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
