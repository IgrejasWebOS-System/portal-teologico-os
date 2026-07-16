import { redirect } from "next/navigation";
import { Boxes, Plus, PackageSearch, History, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import {
  criarProdutoAction,
  atualizarProdutoAction,
  alternarStatusProdutoAction,
  movimentarEstoqueAction,
} from "./actions";

export const metadata = { title: "Produtos — CETADP" };

const TIPO_LABEL: Record<string, string> = {
  CURSO_AVULSO: "Curso avulso",
  MATERIAL_FISICO: "Material físico",
  PDF_DOWNLOAD: "PDF (download gratuito)",
  PDF_VIRTUAL: "PDF (venda)",
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Produto {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  preco_centavos: number;
  estoque: number | null;
  status: string;
}

interface Movimento {
  id: string;
  product_id: string;
  tipo: string;
  quantidade: number;
  estoque_resultante: number | null;
  motivo: string;
  created_at: string;
}

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function ProdutosPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const { data: produtosRaw } = await supabase
    .from("products")
    .select("id, tipo, titulo, descricao, preco_centavos, estoque, status")
    .order("tipo")
    .order("titulo");
  const produtos = (produtosRaw ?? []) as Produto[];

  const produtoIds = produtos.map((p) => p.id);
  const { data: movimentosRaw } = await supabase
    .from("product_stock_movements")
    .select("id, product_id, tipo, quantidade, estoque_resultante, motivo, created_at")
    .in("product_id", produtoIds.length > 0 ? produtoIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(100);
  const movimentos = (movimentosRaw ?? []) as Movimento[];

  const movimentosPorProduto = new Map<string, Movimento[]>();
  for (const m of movimentos) {
    if (!movimentosPorProduto.has(m.product_id)) movimentosPorProduto.set(m.product_id, []);
    movimentosPorProduto.get(m.product_id)!.push(m);
  }

  const produtosFisicos = produtos.filter((p) => p.tipo === "MATERIAL_FISICO");
  const estoqueTotal = produtosFisicos.reduce((a, p) => a + (p.estoque ?? 0), 0);
  const produtosBaixoEstoque = produtosFisicos.filter((p) => (p.estoque ?? 0) <= 5).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Boxes className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">Produtos da Loja</h1>
          <p className="text-iw-muted text-xs mt-0.5">Cadastro de produtos e controle de estoque com histórico.</p>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Produtos ativos</p>
          <p className="text-lg font-black text-iw-navy">{produtos.filter((p) => p.status === "ATIVO").length}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Unidades em estoque</p>
          <p className="text-lg font-black text-iw-navy">{estoqueTotal}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-iw-error" /> Estoque baixo (≤5)
          </p>
          <p className="text-lg font-black text-iw-error">{produtosBaixoEstoque}</p>
        </div>
      </div>

      <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy uppercase tracking-wider">
          <Plus className="w-4 h-4 text-iw-gold" />
          Novo produto
        </summary>
        <form action={criarProdutoAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
          <input
            name="titulo"
            required
            placeholder="Título do produto"
            className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <select
            name="tipo"
            defaultValue="MATERIAL_FISICO"
            className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
          >
            <option value="MATERIAL_FISICO">Material físico (livro, apostila impressa)</option>
            <option value="PDF_VIRTUAL">PDF (venda)</option>
            <option value="PDF_DOWNLOAD">PDF (download gratuito)</option>
          </select>
          <textarea
            name="descricao"
            rows={2}
            placeholder="Descrição (opcional)"
            className="sm:col-span-6 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm resize-none"
          />
          <input
            name="preco"
            required
            placeholder="Preço (ex: 45,00)"
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="estoque"
            type="number"
            min={0}
            placeholder="Estoque inicial (se físico)"
            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-2 bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
          >
            Cadastrar
          </button>
        </form>
      </details>

      <div className="space-y-3">
        {produtos.length === 0 ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm">Nenhum produto cadastrado ainda.</p>
          </div>
        ) : (
          produtos.map((p) => {
            const estoqueBaixo = p.tipo === "MATERIAL_FISICO" && (p.estoque ?? 0) <= 5;
            const historico = movimentosPorProduto.get(p.id) ?? [];

            return (
              <details key={p.id} className="bg-iw-surface border border-iw-border rounded-2xl overflow-hidden group">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-iw-navy truncate">{p.titulo}</p>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                          p.status === "ATIVO" ? "bg-iw-success-bg text-iw-success" : "bg-iw-bg text-iw-muted"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-iw-muted mt-0.5">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                      {p.tipo === "MATERIAL_FISICO" && (
                        <span className={estoqueBaixo ? "text-iw-error font-bold" : ""}>
                          {" "}
                          · {p.estoque ?? 0} em estoque {estoqueBaixo && "⚠"}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-iw-navy shrink-0">{fmt(p.preco_centavos)}</span>
                </summary>

                <div className="px-5 pb-5 pt-1 space-y-4 bg-iw-bg/40 border-t border-iw-border">
                  {/* Editar produto */}
                  <form action={atualizarProdutoAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-3">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="titulo"
                      defaultValue={p.titulo}
                      className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      name="preco"
                      defaultValue={(p.preco_centavos / 100).toFixed(2).replace(".", ",")}
                      className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      name="descricao"
                      defaultValue={p.descricao ?? ""}
                      rows={1}
                      className="sm:col-span-6 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm resize-none"
                      placeholder="Descrição"
                    />
                    <div className="sm:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-iw-blue text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>

                  <form action={alternarStatusProdutoAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={p.status} />
                    <button type="submit" className="text-xs font-bold text-iw-muted hover:text-iw-navy transition-colors">
                      {p.status === "ATIVO" ? "Desativar produto" : "Reativar produto"}
                    </button>
                  </form>

                  {/* Movimentar estoque */}
                  {p.tipo === "MATERIAL_FISICO" && (
                    <>
                      <div className="pt-3 border-t border-iw-border">
                        <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <PackageSearch className="w-3.5 h-3.5" /> Movimentar estoque
                        </p>
                        <form action={movimentarEstoqueAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <input type="hidden" name="product_id" value={p.id} />
                          <select
                            name="tipo"
                            defaultValue="ENTRADA"
                            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm cursor-pointer"
                          >
                            <option value="ENTRADA">Entrada</option>
                            <option value="SAIDA">Saída</option>
                            <option value="AJUSTE">Ajuste (define o total)</option>
                          </select>
                          <input
                            name="quantidade"
                            type="number"
                            min={1}
                            required
                            placeholder="Quantidade"
                            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                          />
                          <input
                            name="motivo"
                            required
                            placeholder="Motivo (ex: reposição, contagem)"
                            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            className="sm:col-span-1 bg-iw-navy text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                          >
                            Lançar
                          </button>
                        </form>
                      </div>

                      {historico.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5" /> Histórico recente
                          </p>
                          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                            {historico.slice(0, 10).map((m) => (
                              <li key={m.id} className="text-[11px] text-iw-muted flex items-center justify-between gap-2">
                                <span>
                                  <span
                                    className={`font-bold ${
                                      m.tipo === "SAIDA" ? "text-iw-error" : m.tipo === "ENTRADA" ? "text-iw-success" : "text-iw-blue"
                                    }`}
                                  >
                                    {m.tipo}
                                  </span>{" "}
                                  {Math.abs(m.quantidade)} un. — {m.motivo}
                                </span>
                                <span className="shrink-0">
                                  {new Date(m.created_at).toLocaleDateString("pt-BR")} · saldo {m.estoque_resultante ?? "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
