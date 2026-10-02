import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ImportarCsvView from "./ImportarCsvView";

export const metadata = { title: "Importar CSV — Membros" };

export default async function ImportarCsvPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: churches }, { data: roles }] = await Promise.all([
    supabase.from("churches").select("id, name").order("name"),
    supabase.from("ecclesiastical_roles").select("id, name, sigla").order("name"),
  ]);

  return (
    <ImportarCsvView
      churches={churches ?? []}
      roles={roles ?? []}
    />
  );
}
