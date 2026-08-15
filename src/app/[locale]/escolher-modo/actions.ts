"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

export async function escolherModoAction(formData: FormData) {
  const modo = (formData.get("modo") as string) === "provas" ? "provas" : "portal";

  const cookieStore = await cookies();
  cookieStore.set("modo_acesso", modo, {
    path: "/",
    maxAge: 60 * 60 * 12, // 12h — no próximo login, pergunta de novo
    httpOnly: false,
  });

  if (modo === "provas") {
    redirect("/provas");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isStaff = user ? await checkIsStaff(supabase, user.id) : false;
  redirect(isStaff ? "/admin" : "/portal");
}
