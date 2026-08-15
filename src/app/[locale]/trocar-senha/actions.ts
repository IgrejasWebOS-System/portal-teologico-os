"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Limpa must_change_password só do PRÓPRIO usuário logado — não recebe
// nenhum id por parâmetro de propósito, pra não virar um jeito de
// qualquer pessoa desmarcar a flag de outra. Usa o cliente admin porque
// profiles só tem UPDATE liberado pra GLOBAL_ADMIN (ver 049/050); aqui
// é o único lugar do sistema onde um usuário comum "edita a si mesmo"
// nessa tabela, e é por isso que passa pelo service role em vez da RLS.
export async function clearMustChangePasswordAction(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
}
