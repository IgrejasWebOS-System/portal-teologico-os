"use server";

import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================
// Preços fixos por curso (course_pricing) — fonte única de verdade
// consumida por Nova Matrícula e Ficha Rápida na hora de sugerir o
// valor/parcelas ao selecionar o curso (ver actions.ts de cada uma).
// Só a secretaria edita aqui; o valor nunca é digitado solto de novo
// nos formulários de matrícula (só pode ser sobrescrito pontualmente).
// ============================================================

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    redirect(
      "/admin/financeiro/precos-cursos?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return { supabase, userId: user.id };
}

function centavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

export async function salvarPrecoCursoAction(formData: FormData) {
  const { supabase, userId } = await requireStaff();

  const courseId = (formData.get("course_id") as string) || "";
  const valorMatricula = centavos((formData.get("valor_matricula") as string) || "0");
  const valorParcela = centavos((formData.get("valor_parcela") as string) || "0");
  const numeroParcelas = Math.min(12, Math.max(1, Number(formData.get("numero_parcelas")) || 1));

  if (!courseId) {
    redirect("/admin/financeiro/precos-cursos?error=" + encodeURIComponent("Curso inválido."));
  }
  if (valorParcela <= 0) {
    redirect(
      "/admin/financeiro/precos-cursos?error=" + encodeURIComponent("Informe o valor da parcela.")
    );
  }

  const { error } = await supabase.from("course_pricing").upsert(
    {
      course_id: courseId,
      valor_matricula_centavos: valorMatricula,
      valor_parcela_centavos: valorParcela,
      numero_parcelas: numeroParcelas,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "course_id" }
  );

  if (error) {
    console.error("[precos-cursos/actions]", error);
    redirect(
      "/admin/financeiro/precos-cursos?error=" +
        encodeURIComponent("Erro ao salvar. Tente novamente.")
    );
  }

  revalidatePath("/admin/financeiro/precos-cursos");
  redirect("/admin/financeiro/precos-cursos?msg=" + encodeURIComponent("Preço atualizado."));
}
