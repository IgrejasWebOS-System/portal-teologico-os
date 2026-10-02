import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Upsert de profissão livre (20/09/2026, pedido do Joaquim) — quando a
// pessoa digita uma profissão que não estava na busca (settings_professions)
// e usa "Usar 'X' mesmo assim" (ver BuscaOuCriarInput.tsx), a profissão
// nova precisa ficar salva na tabela pra aparecer na busca de quem vier
// depois. Sem isso, cada pessoa que digita uma profissão "nova" repete o
// mesmo problema pra sempre.
//
// Busca é case-insensitive (ilike) — evita duplicar "Pedreiro"/"PEDREIRO"/
// "pedreiro" como três linhas diferentes; a gravação em si é sempre em
// caixa alta, pedido explícito do Joaquim, igual ao padrão do resto do
// cadastro (aplicarMaiusculaNoEvento).
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertProfissaoLivre(admin: SupabaseClient<any>, nomeDigitado: string | null): Promise<void> {
  const nome = nomeDigitado?.trim().toUpperCase();
  if (!nome) return;

  const { data: existente } = await admin
    .from("settings_professions")
    .select("id")
    .ilike("name", nome)
    .maybeSingle();

  if (existente) return;

  const { error } = await admin.from("settings_professions").insert({ name: nome });
  if (error) {
    // Não bloqueia o salvamento da ficha por causa disso — profissão é
    // dado complementar, não crítico. Só loga pra investigar depois.
    console.error("[upsertProfissaoLivre] erro ao gravar profissão nova:", error);
  }
}
