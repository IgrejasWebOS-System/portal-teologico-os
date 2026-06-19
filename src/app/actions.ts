"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Deslogar somente este dispositivo
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// Deslogar TODOS os dispositivos / sessões ativas
export async function signOutGlobalAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
