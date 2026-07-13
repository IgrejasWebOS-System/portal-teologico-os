// ============================================================
// Papéis com acesso de secretaria/staff no portal-teologico-os.
// Compartilhado entre /admin/inscricoes e /admin/conteudo para
// não duplicar a lista de papéis em cada rota administrativa.
//
// O tipo do client fica solto de propósito (em vez de importar
// SupabaseClient<Database> de @supabase/supabase-js) para aceitar
// tanto o client de server.ts quanto o de admin.ts sem conflito
// de generics no tsc --noEmit.
// ============================================================

export const STAFF_ROLES = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"];

type MinimalSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: { system_role?: string } | null }>;
      };
    };
  };
};

export async function checkIsStaff(
  supabase: MinimalSupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", userId)
    .single();

  return !!profile && STAFF_ROLES.includes(profile.system_role ?? "");
}
