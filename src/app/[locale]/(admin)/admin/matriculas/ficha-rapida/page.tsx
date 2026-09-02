import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import FichaRapidaForm from "./FichaRapidaForm";

export const metadata = { title: "Ficha Rápida — CETADP" };

export default async function FichaRapidaPage() {
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

  const [{ data: campos }, { data: cursos }, { data: churches }, { data: setores }] = await Promise.all([
    supabase.from("ead_campos_ministerios").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("courses").select("id, title, module").order("title"),
    supabase.from("churches").select("id, name, sector_id").order("name"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  return (
    <FichaRapidaForm
      campos={campos ?? []}
      cursos={cursos ?? []}
      churches={churches ?? []}
      setores={setores ?? []}
    />
  );
}
