"use client";

// ============================================================
// Carrinho de compras da Loja (cursos avulsos, material físico e
// PDFs pagos) — guardado em localStorage no navegador. Simples de
// propósito: o servidor sempre revalida preço/disponibilidade real
// no momento do checkout (finalizarCompraAction), então o que fica
// aqui é só para exibição e conveniência do visitante.
// ============================================================

const CHAVE = "cetadp_carrinho";

export type TipoProduto = "CURSO_AVULSO" | "MATERIAL_FISICO" | "PDF_DOWNLOAD" | "PDF_VIRTUAL";

export interface ItemCarrinho {
  productId: string;
  titulo: string;
  precoCentavos: number;
  quantidade: number;
  tipo: TipoProduto;
}

function lerCarrinho(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAVE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarCarrinho(itens: ItemCarrinho[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  window.dispatchEvent(new CustomEvent("carrinho:atualizado"));
}

export function obterCarrinho(): ItemCarrinho[] {
  return lerCarrinho();
}

export function adicionarAoCarrinho(item: Omit<ItemCarrinho, "quantidade">, quantidade = 1) {
  const itens = lerCarrinho();
  const existente = itens.find((i) => i.productId === item.productId);
  if (existente) {
    existente.quantidade += quantidade;
  } else {
    itens.push({ ...item, quantidade });
  }
  salvarCarrinho(itens);
}

export function removerDoCarrinho(productId: string) {
  salvarCarrinho(lerCarrinho().filter((i) => i.productId !== productId));
}

export function atualizarQuantidade(productId: string, quantidade: number) {
  const itens = lerCarrinho();
  const item = itens.find((i) => i.productId === productId);
  if (item) {
    item.quantidade = Math.max(1, Math.floor(quantidade) || 1);
    salvarCarrinho(itens);
  }
}

export function limparCarrinho() {
  salvarCarrinho([]);
}

export function contarItensCarrinho(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + i.quantidade, 0);
}
