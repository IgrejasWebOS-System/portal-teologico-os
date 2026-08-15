import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditarMembroForm from "./EditarMembroForm";
import MemberFunctionsCard from "./MemberFunctionsCard";

export const metadata = { title: "Editar Membro — Igreja" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function EditarMembroPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { msg, error: errorMsg } = await searchParams;
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

  return (
    <div className="w-full">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- member vem de select("*", ecclesiastical_roles(...), churches(...)); o shape real (joins incluídos) não bate 1:1 com o tipo estreito do formulário, mesmo padrão usado em outros pontos do projeto */}
      <EditarMembroForm member={member as any} />
      <div className="mt-8 pb-20">
        <MemberFunctionsCard
          memberId={id}
          churchId={member.church_id as string | null}
          msg={msg}
          error={errorMsg}
        />
      </div>
    </div>
  );
}
