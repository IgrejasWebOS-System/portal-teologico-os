import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import NovoMembroForm from "./NovoMembroForm";

export const metadata = { title: "Novo Membro — Igreja" };

export default async function NovoMembroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NovoMembroForm />;
}
