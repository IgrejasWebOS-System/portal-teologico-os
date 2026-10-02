"use server";

// ============================================================
// Ações do Dashboard admin — estoque de material didático (29/09/2026,
// pedido do Joaquim: dashboard gerencial igual à planilha "POSIÇÃO
// FINANCEIRA E GERENCIAMENTO DE ESTOQUE"), redesenhado no mesmo dia depois
// que o Joaquim explicou o fluxo real da gráfica (migration 122): material
// é cadastrado por AULA (lesson_id), não mais por curso inteiro, e não há
// mais desconto automático por matrícula — o consumo de estoque acontece
// quando a secretaria marca um pedidos_material como RECEBIDO.
// ============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };
  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) return { ok: false as const };
  return { ok: true as const, supabase };
}

export async function criarMaterialDidaticoAction(formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim();
  const tipo = (formData.get("tipo") as string) || "";
  const curso_id = (formData.get("curso_id") as string) || null;
  const lesson_id = (formData.get("lesson_id") as string) || null;
  const estoque_atual = Number((formData.get("estoque_atual") as string) || "0");

  if (!nome || !["LIVRO", "PROVA"].includes(tipo)) {
    return { success: false, message: "Preencha o nome e o tipo (Livro ou Prova)." };
  }

  const auth = await requireStaff();
  if (!auth.ok) return { success: false, message: "Acesso restrito à secretaria." };

  const { error } = await auth.supabase.from("materiais_didaticos").insert({
    nome,
    tipo,
    curso_id,
    lesson_id,
    estoque_atual: Number.isFinite(estoque_atual) ? estoque_atual : 0,
  });

  if (error) {
    console.error("[admin/actions] criarMaterialDidaticoAction", error);
    return { success: false, message: "Erro ao cadastrar o material." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function darEntradaEstoqueAction(formData: FormData) {
  const id = formData.get("id") as string;
  const quantidade = Number((formData.get("quantidade") as string) || "0");

  if (!id || !Number.isFinite(quantidade) || quantidade === 0) {
    return { success: false, message: "Quantidade inválida." };
  }

  const auth = await requireStaff();
  if (!auth.ok) return { success: false, message: "Acesso restrito à secretaria." };

  const { data: material } = await auth.supabase
    .from("materiais_didaticos")
    .select("estoque_atual")
    .eq("id", id)
    .single();

  if (!material) return { success: false, message: "Material não encontrado." };

  const { error } = await auth.supabase
    .from("materiais_didaticos")
    .update({ estoque_atual: material.estoque_atual + quantidade, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[admin/actions] darEntradaEstoqueAction", error);
    return { success: false, message: "Erro ao atualizar o estoque." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function apagarMaterialDidaticoAction(id: string) {
  const auth = await requireStaff();
  if (!auth.ok) return;

  await auth.supabase.from("materiais_didaticos").delete().eq("id", id);
  revalidatePath("/admin");
}

// ── Pedidos de material (migration 122) — visão consolidada da secretaria
// ────────────────────────────────────────────────────────────────────
// A secretaria fecha uma remessa só com a gráfica juntando os pedidos de
// todas as turmas; o ciclo de status é manual (nada aqui desconta estoque
// sozinho, exceto ao marcar RECEBIDO, que soma no estoque_atual do
// material vinculado, se houver).
export async function atualizarStatusPedidoMaterialAction(formData: FormData) {
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "";

  if (!id || !["SOLICITADO", "ENVIADO_GRAFICA", "RECEBIDO", "CANCELADO"].includes(status)) {
    return { success: false, message: "Status inválido." };
  }

  const auth = await requireStaff();
  if (!auth.ok) return { success: false, message: "Acesso restrito à secretaria." };

  const { data: pedido } = await auth.supabase
    .from("pedidos_material")
    .select("material_id, quantidade_solicitada, status")
    .eq("id", id)
    .single();

  if (!pedido) return { success: false, message: "Pedido não encontrado." };

  const { error } = await auth.supabase
    .from("pedidos_material")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[admin/actions] atualizarStatusPedidoMaterialAction", error);
    return { success: false, message: "Erro ao atualizar o pedido." };
  }

  // Marcar como RECEBIDO soma a quantidade no estoque do material vinculado
  // (se o pedido tiver um material_id definido) — só uma vez, na transição
  // pra RECEBIDO (não repete se já estava RECEBIDO antes).
  if (status === "RECEBIDO" && pedido.status !== "RECEBIDO" && pedido.material_id) {
    const { data: material } = await auth.supabase
      .from("materiais_didaticos")
      .select("estoque_atual")
      .eq("id", pedido.material_id)
      .single();

    if (material) {
      await auth.supabase
        .from("materiais_didaticos")
        .update({ estoque_atual: material.estoque_atual + pedido.quantidade_solicitada, updated_at: new Date().toISOString() })
        .eq("id", pedido.material_id);
    }
  }

  revalidatePath("/admin");
  return { success: true };
}
