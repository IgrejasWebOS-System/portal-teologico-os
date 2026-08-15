"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkIsStaff } from "@/utils/staff";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    redirect(
      "/admin/pedidos?error=" +
        encodeURIComponent("Acesso restrito à secretaria do CETADP.")
    );
  }

  return supabase;
}

export async function marcarComoEnviadoAction(formData: FormData) {
  const supabase = await requireStaff();
  const id = formData.get("id") as string;

  await supabase
    .from("orders")
    .update({ fulfillment_status: "ENVIADO" })
    .eq("id", id);

  revalidatePath("/admin/pedidos");
}

export async function marcarComoEntregueAction(formData: FormData) {
  const supabase = await requireStaff();
  const id = formData.get("id") as string;

  await supabase
    .from("orders")
    .update({ fulfillment_status: "ENTREGUE" })
    .eq("id", id);

  revalidatePath("/admin/pedidos");
}
