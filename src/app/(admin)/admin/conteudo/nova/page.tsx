import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import NovaAulaForm from "./NovaAulaForm";
import type { Course } from "@/types";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Inserir Aula — Admin" };

interface Props {
  searchParams: Promise<{ course_id?: string; edit?: string }>;
}

export default async function NovaAulaPage({ searchParams }: Props) {
  const { course_id, edit: editId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, module")
    .order("module")
    .order("title");

  const courseList = (courses ?? []) as Pick<Course, "id" | "title" | "module">[];

  // Se edição, busca a aula existente
  let existingLesson = null;
  if (editId) {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", editId)
      .single();
    existingLesson = data;
  }

  return (
    <NovaAulaForm
      courses={courseList}
      defaultCourseId={course_id}
      existingLesson={existingLesson}
    />
  );
}
