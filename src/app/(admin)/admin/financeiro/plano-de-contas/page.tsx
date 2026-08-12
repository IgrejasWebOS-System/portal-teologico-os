import Link from "next/link";
import { redirect } from "next/navigation";
import { ListTree, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import { criarCategoriaAction, alternarCategoriaAtivaAction } from "../actions";

export const metadata = { title: "Plano de Contas — CETADP" };

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function PlanoDeContasPage({ searchParams }: PageProps) {
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

  const { data: categorias } = await supabase
    .from("fin_categorias")
    .select("id, nome, tipo, codigo, ativo")
    .order("tipo")
    .order("codigo");

  const receitas = (categorias ?? []).filter((c) => c.tipo === "RECEITA");
  const despesas = (categorias ?? []).filter((c) => c.tipo === "DESPESA");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={ListTree}
        title="Plano de Contas"
        description="Categorias de receita e despesa usadas no caixa diário."
        backHref="/admin/financeiro"
        backLabel="Voltar para Financeiro"
      />

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-iw-success uppercase tracking-wider mb-3">Receitas</h2>
          <ul className="divide-y divide-iw-border">
            {receitas.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                <span className={`text-sm ${c.ativo ? "text-iw-navy" : "text-iw-muted line-through"}`}>
                  {c.codigo ? `${c.codigo} — ` : ""}
                  {c.nome}
                </span>
                <form action={alternarCategoriaAtivaAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativo" value={String(c.ativo)} />
                  <button
                    type="submit"
                    className="text-[11px] font-semibold text-iw-muted hover:text-iw-navy transition-colors"
                  >
                    {c.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-iw-error uppercase tracking-wider mb-3">Despesas</h2>
          <ul className="divide-y divide-iw-border">
            {despesas.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                <span className={`text-sm ${c.ativo ? "text-iw-navy" : "text-iw-muted line-through"}`}>
                  {c.codigo ? `${c.codigo} — ` : ""}
                  {c.nome}
                </span>
                <form action={alternarCategoriaAtivaAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativo" value={String(c.ativo)} />
                  <button
                    type="submit"
                    className="text-[11px] font-semibold text-iw-muted hover:text-iw-navy transition-colors"
                  >
                    {c.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-iw-surface border border-iw-border rounded-2xl p-5">
        <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider mb-3 inline-flex items-center gap-2">
          <Plus className="w-4 h-4 text-iw-gold" />
          Nova categoria
        </h2>
        <form action={criarCategoriaAction} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px_auto] gap-3">
          <input
            name="nome"
            required
            placeholder="Nome da categoria"
            className="bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none"
          />
          <select
            name="tipo"
            required
            defaultValue=""
            className="bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none cursor-pointer"
          >
            <option value="" disabled>Tipo</option>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </select>
          <input
            name="codigo"
            placeholder="Código"
            className="bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm focus:border-iw-gold focus:outline-none"
          />
          <button
            type="submit"
            className="bg-[#E88D0C] hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity border border-black"
          >
            Criar
          </button>
        </form>
      </div>
    </div>
  );
}
