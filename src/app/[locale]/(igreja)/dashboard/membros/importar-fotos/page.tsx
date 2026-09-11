import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ImportarFotosView from "./ImportarFotosView";

export const metadata = { title: "Importar Fotos — Membros" };

export default async function ImportarFotosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, registration_number, photo_url, church_id, churches(name)")
    .not("registration_number", "is", null)
    .order("full_name");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ImportarFotosView members={(members ?? []) as any} />;
}
