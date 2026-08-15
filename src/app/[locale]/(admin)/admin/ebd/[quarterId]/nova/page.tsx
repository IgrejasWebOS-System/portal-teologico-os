import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import type { EbdQuarter, EbdLesson } from "@/types";
import LicaoForm from "./LicaoForm";

export const metadata = { title: "Lição — Admin EBD" };

interface PageProps {
  params: Promise<{ quarterId: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function NovaLicaoPage({ params, searchParams }: PageProps) {
  const { quarterId } = await params;
  const { edit } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: quarterData } = await supabase.from("ebd_quarters").select("*").eq("id", quarterId).single();
  if (!quarterData) notFound();
  const quarter = quarterData as EbdQuarter;

  let lesson: EbdLesson | null = null;
  if (edit) {
    const { data } = await supabase.from("ebd_lessons").select("*").eq("id", edit).eq("quarter_id", quarterId).single();
    lesson = (data as EbdLesson) ?? null;
  }

  let proximoNumero = 1;
  if (!lesson) {
    const { data: existentes } = await supabase
      .from("ebd_lessons")
      .select("lesson_number")
      .eq("quarter_id", quarterId)
      .order("lesson_number", { ascending: false })
      .limit(1);
    proximoNumero = existentes && existentes.length > 0 ? existentes[0].lesson_number + 1 : 1;
  }

  return <LicaoForm quarter={quarter} lesson={lesson} proximoNumero={proximoNumero} />;
}
