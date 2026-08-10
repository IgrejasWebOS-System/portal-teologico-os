"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Admin FAQ — CRUD de categorias e perguntas/respostas.
// Padrão redirect-based (igual admin/ebd/actions.ts,
// dashboard/configuracoes/actions.ts): funções usadas direto em
// <form action={...}> só terminam em redirect() (never), que
// satisfaz o tipo void | Promise<void> exigido pelo action de form.
// ============================================================

const BASE = "/admin/faq";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect(BASE + "?error=" + encodeURIComponent("Acesso restrito à secretaria do CETADP."));
  }

  return { supabase };
}

function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Categorias ──────────────────────────────────────────────
export async function addFaqCategoriaAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const nome = (formData.get("nome") as string)?.trim();
  const ordem = Number(formData.get("ordem")) || 0;

  if (!nome) {
    redirect(BASE + "?error=" + encodeURIComponent("Informe o nome da categoria."));
  }

  const slug = slugify(nome!);
  const { error } = await supabase.from("faq_categories").insert({ nome, slug, ordem });

  if (error) {
    if (error.code !== "23505") console.error("[faq/actions]", error);
    const msg = error.code === "23505" ? "Já existe uma categoria parecida com esse nome." : "Erro ao salvar. Tente novamente.";
    redirect(BASE + "?error=" + encodeURIComponent(msg));
  }

  revalidatePath(BASE);
  redirect(BASE + "?msg=" + encodeURIComponent(`Categoria "${nome}" criada.`));
}

export async function updateFaqCategoriaAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const id = (formData.get("id") as string) || "";
  const nome = (formData.get("nome") as string)?.trim();
  const ordem = Number(formData.get("ordem")) || 0;
  const ativo = formData.get("ativo") === "on";

  if (!id || !nome) {
    redirect(BASE + "?error=" + encodeURIComponent("Categoria inválida."));
  }

  const { error } = await supabase
    .from("faq_categories")
    .update({ nome, ordem, ativo })
    .eq("id", id);

  if (error) {
    console.error("[faq/actions]", error);
    redirect(BASE + "?error=" + encodeURIComponent("Erro ao salvar. Tente novamente."));
  }

  revalidatePath(BASE);
  redirect(BASE + "?msg=" + encodeURIComponent(`Categoria "${nome}" atualizada.`));
}

export async function deleteFaqCategoriaAction(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("faq_categories").delete().eq("id", id);
  if (error) {
    console.error("[faq/actions]", error);
    return { success: false, message: "Erro ao excluir. Tente novamente." };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function deleteFaqCategoriaFormAction(id: string): Promise<void> {
  await deleteFaqCategoriaAction(id);
}

// ── Perguntas/respostas ────────────────────────────────────
export async function addFaqItemAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const categoryId = (formData.get("category_id") as string) || "";
  const pergunta = (formData.get("pergunta") as string)?.trim();
  const resposta = (formData.get("resposta") as string)?.trim();

  if (!categoryId || !pergunta || !resposta) {
    redirect(BASE + "?error=" + encodeURIComponent("Selecione a categoria e preencha pergunta e resposta."));
  }

  const { error } = await supabase.from("faq_items").insert({
    category_id: categoryId,
    pergunta,
    resposta,
  });

  if (error) {
    console.error("[faq/actions]", error);
    redirect(BASE + "?error=" + encodeURIComponent("Erro ao salvar. Tente novamente."));
  }

  revalidatePath(BASE);
  redirect(BASE + "?msg=" + encodeURIComponent("Pergunta cadastrada."));
}

export async function updateFaqItemAction(formData: FormData) {
  const { supabase } = await requireStaff();

  const id = (formData.get("id") as string) || "";
  const categoryId = (formData.get("category_id") as string) || "";
  const pergunta = (formData.get("pergunta") as string)?.trim();
  const resposta = (formData.get("resposta") as string)?.trim();
  const ativo = formData.get("ativo") === "on";

  if (!id || !categoryId || !pergunta || !resposta) {
    redirect(BASE + "?error=" + encodeURIComponent("Selecione a categoria e preencha pergunta e resposta."));
  }

  const { error } = await supabase
    .from("faq_items")
    .update({
      category_id: categoryId,
      pergunta,
      resposta,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[faq/actions]", error);
    redirect(BASE + "?error=" + encodeURIComponent("Erro ao salvar. Tente novamente."));
  }

  revalidatePath(BASE);
  redirect(BASE + "?msg=" + encodeURIComponent("Pergunta atualizada."));
}

export async function deleteFaqItemAction(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  if (error) {
    console.error("[faq/actions]", error);
    return { success: false, message: "Erro ao excluir. Tente novamente." };
  }
  revalidatePath(BASE);
  return { success: true };
}

export async function deleteFaqItemFormAction(id: string): Promise<void> {
  await deleteFaqItemAction(id);
}
