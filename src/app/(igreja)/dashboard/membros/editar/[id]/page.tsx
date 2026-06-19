import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditarMembroForm from "./EditarMembroForm";

export const metadata = { title: "Editar Membro — Igreja" };

export default async function EditarMembroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member, error } = await supabase
    .from("members")
    .select("*, ecclesiastical_roles(id, name), churches(name)")
    .eq("id", id)
    .single();

  if (error || !member) notFound();

  return <EditarMembroForm member={member as any} />;
}
