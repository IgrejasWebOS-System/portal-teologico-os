import { redirect } from "next/navigation";
import { HelpCircle, Plus, Trash2, FolderPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import {
  addFaqCategoriaAction,
  updateFaqCategoriaAction,
  deleteFaqCategoriaFormAction,
  addFaqItemAction,
  updateFaqItemAction,
  deleteFaqItemFormAction,
} from "./actions";

export const metadata = { title: "FAQ — CETADP" };

type Categoria = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
};

type Item = {
  id: string;
  category_id: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
};

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function AdminFaqPage({ searchParams }: PageProps) {
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

  const [{ data: categoriasRaw }, { data: itemsRaw }] = await Promise.all([
    supabase.from("faq_categories").select("id, nome, slug, ordem, ativo").order("ordem"),
    supabase.from("faq_items").select("id, category_id, pergunta, resposta, ativo").order("ordem"),
  ]);

  const categorias = (categoriasRaw ?? []) as Categoria[];
  const items = (itemsRaw ?? []) as Item[];

  const itemsPorCategoria = new Map<string, Item[]>();
  for (const it of items) {
    if (!itemsPorCategoria.has(it.category_id)) itemsPorCategoria.set(it.category_id, []);
    itemsPorCategoria.get(it.category_id)!.push(it);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">FAQ — Central de Ajuda</h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Perguntas e respostas exibidas no widget flutuante, por categoria (módulo, curso, departamento, etc).
          </p>
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

      {/* Nova categoria */}
      <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy uppercase tracking-wider">
          <FolderPlus className="w-4 h-4 text-iw-gold" />
          Nova categoria
        </summary>
        <form action={addFaqCategoriaAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
          <input
            name="nome"
            required
            placeholder="Nome da categoria (ex: Curso Básico, RH, Reciclagem 2026)"
            className="sm:col-span-4 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <input
            name="ordem"
            type="number"
            defaultValue={categorias.length}
            placeholder="Ordem"
            className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-1 bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
          >
            Criar
          </button>
        </form>
      </details>

      {/* Categorias e perguntas */}
      {categorias.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhuma categoria cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorias.map((cat) => {
            const itensCategoria = itemsPorCategoria.get(cat.id) ?? [];
            return (
              <div key={cat.id} className="bg-iw-surface border border-iw-border rounded-2xl overflow-hidden">
                {/* Cabeçalho da categoria (editável) */}
                <details className="border-b border-iw-border">
                  <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <p className="text-sm font-bold text-iw-navy truncate">{cat.nome}</p>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                          cat.ativo ? "bg-iw-success-bg text-iw-success" : "bg-iw-bg text-iw-muted"
                        }`}
                      >
                        {cat.ativo ? "Ativa" : "Inativa"}
                      </span>
                      <span className="text-[11px] text-iw-muted shrink-0">
                        {itensCategoria.length} pergunta(s)
                      </span>
                    </div>
                  </summary>

                  <div className="px-5 pb-5 pt-1 bg-iw-bg/40 space-y-3">
                    <form action={updateFaqCategoriaAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-3">
                      <input type="hidden" name="id" value={cat.id} />
                      <input
                        name="nome"
                        defaultValue={cat.nome}
                        required
                        className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                      />
                      <input
                        name="ordem"
                        type="number"
                        defaultValue={cat.ordem}
                        className="sm:col-span-1 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                      />
                      <label className="sm:col-span-1 flex items-center gap-1.5 text-xs text-iw-muted">
                        <input type="checkbox" name="ativo" defaultChecked={cat.ativo} className="rounded" />
                        Ativa
                      </label>
                      <button
                        type="submit"
                        className="sm:col-span-1 bg-iw-blue hover:bg-iw-navy text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        Salvar
                      </button>
                    </form>
                    <form action={deleteFaqCategoriaFormAction.bind(null, cat.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-muted hover:text-iw-error transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover categoria (e suas perguntas)
                      </button>
                    </form>
                  </div>
                </details>

                {/* Nova pergunta nesta categoria */}
                <details className="border-b border-iw-border">
                  <summary className="cursor-pointer list-none px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-iw-navy uppercase tracking-wider">
                    <Plus className="w-3.5 h-3.5 text-iw-gold" />
                    Nova pergunta
                  </summary>
                  <form action={addFaqItemAction} className="px-5 pb-4 pt-1 space-y-2.5">
                    <input type="hidden" name="category_id" value={cat.id} />
                    <input
                      name="pergunta"
                      required
                      placeholder="Pergunta"
                      className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm"
                    />
                    <textarea
                      name="resposta"
                      required
                      rows={3}
                      placeholder="Resposta"
                      className="w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm resize-none"
                    />
                    <button
                      type="submit"
                      className="bg-iw-gold hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-opacity"
                    >
                      Cadastrar pergunta
                    </button>
                  </form>
                </details>

                {/* Lista de perguntas */}
                {itensCategoria.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-iw-muted">Nenhuma pergunta nesta categoria ainda.</p>
                ) : (
                  <div className="divide-y divide-iw-border">
                    {itensCategoria.map((item) => (
                      <details key={item.id}>
                        <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between gap-3 hover:bg-iw-bg/50 transition-colors">
                          <span className="text-xs font-semibold text-iw-navy truncate">{item.pergunta}</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                              item.ativo ? "bg-iw-success-bg text-iw-success" : "bg-iw-bg text-iw-muted"
                            }`}
                          >
                            {item.ativo ? "Ativa" : "Inativa"}
                          </span>
                        </summary>

                        <div className="px-5 pb-4 pt-1 bg-iw-bg/40 space-y-3">
                          <form action={updateFaqItemAction} className="space-y-2.5 pt-2">
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="category_id" value={cat.id} />
                            <input
                              name="pergunta"
                              defaultValue={item.pergunta}
                              required
                              className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                            />
                            <textarea
                              name="resposta"
                              defaultValue={item.resposta}
                              required
                              rows={3}
                              className="w-full bg-white border border-iw-border rounded-xl px-3 py-2 text-sm resize-none"
                            />
                            <label className="flex items-center gap-1.5 text-xs text-iw-muted">
                              <input type="checkbox" name="ativo" defaultChecked={item.ativo} className="rounded" />
                              Ativa (visível no widget)
                            </label>
                            <button
                              type="submit"
                              className="bg-iw-blue hover:bg-iw-navy text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                            >
                              Salvar alterações
                            </button>
                          </form>
                          <form action={deleteFaqItemFormAction.bind(null, item.id)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-muted hover:text-iw-error transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remover pergunta
                            </button>
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
