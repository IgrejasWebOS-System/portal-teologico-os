import { redirect } from "next/navigation";
import { Boxes, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { cadastrarBemAction, registrarMovimentacaoAction } from "./actions";

export const metadata = { title: "Patrimônio — CETADP" };

const CATEGORIA_LABEL: Record<string, string> = {
  IMOVEL: "Imóvel",
  MOVEL: "Móvel",
  EQUIPAMENTO: "Equipamento",
  VEICULO: "Veículo",
  INSTRUMENTO_MUSICAL: "Instrumento musical",
  INFORMATICA: "Informática",
  OUTRO: "Outro",
};

const STATUS_STYLE: Record<string, string> = {
  ATIVO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  BAIXADO: "bg-iw-bg text-iw-muted border-iw-border",
  EM_MANUTENCAO: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  TRANSFERIDO: "bg-iw-blue/10 text-iw-blue border-iw-blue/30",
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function PatrimonioPage({ searchParams }: PageProps) {
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

  const { data: itens } = await supabase
    .from("patrimony_items")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: categoriasFinanceiras } = await supabase
    .from("fin_categorias")
    .select("id, nome")
    .eq("tipo", "DESPESA")
    .eq("ativo", true)
    .order("codigo");

  const valorTotal = (itens ?? [])
    .filter((i) => i.status !== "BAIXADO")
    .reduce((acc, i) => acc + i.valor_aquisicao_centavos, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Patrimônio / Inventário</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              {itens?.length ?? 0} bens cadastrados · valor total (ativos): {fmt(valorTotal)}
            </p>
          </div>
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

      <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
        <summary className="cursor-pointer text-sm font-bold text-iw-navy uppercase tracking-wider inline-flex items-center gap-2 list-none">
          <Plus className="w-4 h-4 text-iw-gold" />
          Cadastrar novo bem
        </summary>
        <form action={cadastrarBemAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Nome *</label>
            <input name="nome" required className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Categoria</label>
            <select name="categoria" defaultValue="OUTRO" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer">
              {Object.entries(CATEGORIA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Descrição</label>
            <input name="descricao" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Valor de aquisição (R$) *</label>
            <input name="valor_aquisicao" required placeholder="Ex: 2.500,00" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Data de aquisição</label>
            <input name="data_aquisicao" type="date" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Fornecedor</label>
            <input name="fornecedor" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Nota fiscal</label>
            <input name="nota_fiscal" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Vida útil (anos)</label>
            <input name="vida_util_anos" type="number" min="1" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Taxa de depreciação anual (%)</label>
            <input name="taxa_depreciacao_anual" type="number" step="0.01" min="0" max="100" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Localização</label>
            <input name="localizacao" placeholder="Ex: Secretaria, Sala 3..." className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Responsável</label>
            <input name="responsavel_nome" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5">Categoria financeira (despesa)</label>
            <select name="categoria_financeira_id" defaultValue="" className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer">
              <option value="">Sem vínculo</option>
              {(categoriasFinanceiras ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-opacity">
              Cadastrar
            </button>
          </div>
        </form>
      </details>

      {!itens || itens.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum bem cadastrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {itens.map((item) => (
            <div key={item.id} className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-iw-navy">{item.nome}</p>
                  <p className="text-xs text-iw-muted mt-0.5">
                    {item.numero_tombamento} · {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
                    {item.localizacao ? ` · ${item.localizacao}` : ""}
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[item.status] ?? STATUS_STYLE.ATIVO}`}>
                  {item.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-iw-muted">
                <span><strong className="text-iw-navy">Aquisição:</strong> {fmt(item.valor_aquisicao_centavos)}</span>
                {item.taxa_depreciacao_anual != null && (
                  <span><strong className="text-iw-navy">Depreciação:</strong> {item.taxa_depreciacao_anual}% a.a.</span>
                )}
                {item.responsavel_nome && (
                  <span><strong className="text-iw-navy">Responsável:</strong> {item.responsavel_nome}</span>
                )}
              </div>

              <details className="pt-2 border-t border-iw-border">
                <summary className="cursor-pointer text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors list-none">
                  Registrar movimentação
                </summary>
                <form action={registrarMovimentacaoAction} className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-3">
                  <input type="hidden" name="item_id" value={item.id} />
                  <select name="tipo" required defaultValue="" className="sm:col-span-1 bg-white border border-iw-border rounded-lg px-2.5 py-2 text-xs cursor-pointer">
                    <option value="" disabled>Tipo</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="MANUTENCAO">Manutenção</option>
                    <option value="RETORNO_MANUTENCAO">Retorno manutenção</option>
                    <option value="REAVALIACAO">Reavaliação</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                  <input name="localizacao_nova" placeholder="Nova localização (se transferência)" className="sm:col-span-1 bg-white border border-iw-border rounded-lg px-2.5 py-2 text-xs" />
                  <input name="valor" placeholder="Novo valor (se reavaliação)" className="sm:col-span-1 bg-white border border-iw-border rounded-lg px-2.5 py-2 text-xs" />
                  <input name="responsavel_nome" placeholder="Responsável" className="sm:col-span-1 bg-white border border-iw-border rounded-lg px-2.5 py-2 text-xs" />
                  <input name="descricao" required placeholder="Descrição *" className="sm:col-span-1 bg-white border border-iw-border rounded-lg px-2.5 py-2 text-xs" />
                  <button type="submit" className="sm:col-span-5 justify-self-start bg-iw-navy hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-lg transition-opacity">
                    Registrar
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
