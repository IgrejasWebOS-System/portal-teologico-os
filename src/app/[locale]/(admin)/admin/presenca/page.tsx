import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverContexto, turmasDoEscopo } from "@/utils/presenca-contexto";
import PresencaPainel from "@/components/presenca/PresencaPainel";

export const metadata = { title: "Presença — Secretaria Geral" };
export const dynamic = "force-dynamic";

export default async function PresencaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string; aula?: string; data?: string; aba?: string; msg?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = await resolverContexto(supabase, user.id, "admin");
  if (!ctx) redirect("/admin");
  const turmas = await turmasDoEscopo(supabase, createAdminClient(), ctx);
  return <PresencaPainel ctx={ctx} turmas={turmas} basePath="/admin/presenca" sp={sp} />;
}
