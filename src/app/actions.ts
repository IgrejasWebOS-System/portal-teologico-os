"use server";

import { createClient } from "@/utils/supabase/server";
// redirect() de next/navigation não preserva o prefixo de idioma — mesmo
// bug já corrigido em login/cadastro/recuperar-senha/inscrição/checkout.
// Aqui o locale vem de um campo oculto no <form>, preenchido pelo
// Sidebar.tsx via useLocale() (é Client Component, não recebe params).
import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

// Deslogar somente este dispositivo
export async function signOutAction(formData: FormData) {
  const localeRaw = formData.get("locale");
  const locale = hasLocale(routing.locales, localeRaw) ? localeRaw : routing.defaultLocale;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect({ href: "/", locale });
}

// Deslogar TODOS os dispositivos / sessões ativas
export async function signOutGlobalAction(formData: FormData) {
  const localeRaw = formData.get("locale");
  const locale = hasLocale(routing.locales, localeRaw) ? localeRaw : routing.defaultLocale;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect({ href: "/login", locale });
}
