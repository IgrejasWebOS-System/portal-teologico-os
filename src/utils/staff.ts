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

// 28/09/2026, pedido do Joaquim: alguns GLOBAL_ADMIN (josias, marcelo,
// pandolfo) precisam ver só um menu curado e ficar de fato bloqueados de
// qualquer outra área administrativa, mesmo digitando a URL direto — ver
// migration 118_admin_roles_menu_restrito.sql e o gate em
// src/utils/supabase/middleware.ts. `supabase` também tipado `any` de
// propósito, mesmo motivo do comentário no topo deste arquivo.
export async function checkMenuRestrito(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("admin_roles")
    .select("menu_restrito")
    .eq("user_id", userId)
    .eq("level", 0)
    .maybeSingle();

  return !!data?.menu_restrito;
}
