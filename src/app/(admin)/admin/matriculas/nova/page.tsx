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

  const [
    { data: campos },
    { data: cursos },
    { data: churches },
    { data: setores },
    { data: turmas },
    { data: professores },
  ] = await Promise.all([
    supabase.from("ead_campos_ministerios").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("courses").select("id, title, module").order("title"),
    supabase.from("churches").select("id, name, sector_id").order("name"),
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("course_editions").select("id, nome, course_id").order("nome"),
    supabase.from("professores").select("id, nome_completo, church_id").order("nome_completo"),
  ]);

  return (
    <NovaMatriculaForm
      campos={campos ?? []}
      cursos={cursos ?? []}
      churches={churches ?? []}
      setores={setores ?? []}
      turmasIniciais={turmas ?? []}
      professoresIniciais={professores ?? []}
      errorMsg={error ? decodeURIComponent(error) : undefined}
    />
  );
}
