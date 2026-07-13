// ============================================================
// Papéis com acesso de secretaria/staff no portal-teologico-os.
// Compartilhado entre /admin/inscricoes e /admin/conteudo para
// não duplicar a lista de papéis em cada rota administrativa.
//
// O parâmetro `supabase` é tipado como `any` de propósito: tentar
// tipá-lo estruturalmente (mesmo com um tipo "mínimo" próprio) faz
// o TypeScript comparar contra o tipo real do SupabaseClient
// (profundamente genérico/recursivo) e estoura em "Type
// instantiation is excessively deep and possibly infinite" no
// build de produção (next build/tsc), embora `next dev` não
// acuse nada. A segurança do check continua sendo em runtime
// (a própria consulta e a RLS do banco), não depende de tipo aqui.
// ============================================================

export const STAFF_ROLES = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"];

export async function checkIsStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", userId)
    .single();

  return !!profile && STAFF_ROLES.includes(profile.system_role ?? "");
}
