import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, Plus, ChevronRight, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import type { EbdQuarter } from "@/types";

export const metadata = { title: "Admin — EBD" };

const AUDIENCE_LABEL: Record<string, string> = {
  ADULTOS: "Adultos",
  JOVENS: "Jovens",
  ADOLESCENTES: "Adolescentes",
  JUNIORES: "Juniores",
  PRIMARIOS: "Primários",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminEbdPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: quartersRaw } = await supabase
    .from("ebd_quarters")
    .select("*")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  const quarters = (quartersRaw ?? []) as EbdQuarter[];

  const { data: lessonCounts } = await supabase.from("ebd_lessons").select("quarter_id");
  const countMap = new Map<string, number>();
  for (const l of lessonCounts ?? []) {
    countMap.set(l.quarter_id, (countMap.get(l.quarter_id) ?? 0) + 1);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-iw-navy flex items-center justify-center shrink-0">
            <BookMarked className="w-6 h-6 text-iw-sky" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-iw-navy tracking-tight">Admin — EBD</h1>
            <p className="text-iw-muted text-sm">
              {quarters.length} trimestres cadastrados · Escola Bíblica Dominical
            </p>
          </div>
        </div>
        <Link
          href="/admin/ebd/nova"
          className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo trimestre
        </Link>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      {quarters.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum trimestre cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quarters.map((q) => {
            const cadastradas = countMap.get(q.id) ?? 0;
            return (
              <Link
                key={q.id}
                href={`/admin/ebd/${q.id}`}
                className="group bg-iw-surface border border-iw-border rounded-2xl p-5 flex flex-col gap-3 hover:border-iw-blue/40 hover:shadow-md transition-all duration-150"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-iw-blue/10 text-iw-blue">
                      {["1°", "2°", "3°", "4°"][q.quarter - 1]} Trimestre {q.year}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-iw-gold/10 text-iw-gold">
                      {AUDIENCE_LABEL[q.audience] ?? q.audience}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-iw-muted group-hover:text-iw-blue group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <p className="font-bold text-iw-navy text-sm">{q.theme ?? "Sem tema definido"}</p>
                <div className="flex items-center gap-4 text-xs text-iw-muted pt-2 border-t border-iw-border">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {cadastradas}/{q.lesson_count} lições cadastradas
                  </span>
                  <span>{q.publisher}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
