import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Cliente administrativo (service_role)
//
// USO EXCLUSIVO em server actions / código de servidor.
// NUNCA importar a partir de um componente "use client", nem
// repassar o retorno desta função para o browser.
//
// Necessário apenas para operações que o RLS legitimamente não
// permite ao usuário comum, como criar (convidar) o usuário de
// autenticação de um aluno recém-aprovado. Toda a checagem de
// "quem pode aprovar uma inscrição" continua sendo feita ANTES,
// com o cliente normal (anon key) + profiles.system_role — este
// cliente admin só executa a etapa que exige privilégio elevado.
// ============================================================
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária apenas no servidor."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
