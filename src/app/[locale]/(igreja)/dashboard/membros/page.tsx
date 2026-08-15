import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MembrosView from "./MembrosView";

export const metadata = { title: "Membros — Igreja" };

export default async function MembrosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select(
      "id, full_name, email, phone, registration_number, status, financial_status, ecclesiastical_status, ecclesiastical_roles(name)"
    )
    .eq("status", "ACTIVE")
    .order("full_name");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <MembrosView initialMembers={(members ?? []) as any} />;
}
