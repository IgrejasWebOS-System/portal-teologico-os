"use server";

// ============================================================
// Leitura pública do módulo de FAQ (widget flutuante global).
// Sem gate de staff — o FAQ é conteúdo de ajuda, aparece pra
// qualquer visitante, logado ou não. Escrita fica em
// src/app/(admin)/admin/faq/actions.ts, restrita a staff.
// ============================================================

import { createClient } from "@/utils/supabase/server";

export type FaqCategoria = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
};

export type FaqItem = {
  id: string;
  category_id: string;
  pergunta: string;
  resposta: string;
};

export async function getFaqCategoriasAtivasAction(): Promise<FaqCategoria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faq_categories")
    .select("id, nome, slug, ordem")
    .eq("ativo", true)
    .order("ordem");

  return (data ?? []) as FaqCategoria[];
}

export async function searchFaqItemsAction(
  categoryId: string | null,
  query: string
): Promise<FaqItem[]> {
  const supabase = await createClient();

  let q = supabase
    .from("faq_items")
    .select("id, category_id, pergunta, resposta")
    .eq("ativo", true)
    .order("ordem");

  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }

  const termo = query.trim();
  if (termo) {
    q = q.textSearch("search_vector", termo, {
      type: "websearch",
      config: "portuguese",
    });
  }

  const { data, error } = await q;
  if (error) return [];

  return (data ?? []) as FaqItem[];
}
