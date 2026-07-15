import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import NovaMatriculaForm from "./NovaMatriculaForm";

export const metadata = { title: "Nova Matrícula — CETADP" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovaMatriculaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const { data: campos } = await supabase
    .from("ead_campos_ministerios")
    .select("id, nome, tipo")
    .eq("ativo", true)
    .order("nome");

  const { data: cursos } = await supabase
    .from("courses")
    .select("id, title, module")
    .order("title");

  return (
    <NovaMatriculaForm
      campos={campos ?? []}
      cursos={cursos ?? []}
      errorMsg={error ? decodeURIComponent(error) : undefined}
    />
  );
}
