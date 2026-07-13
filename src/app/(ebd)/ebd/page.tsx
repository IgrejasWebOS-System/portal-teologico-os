import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BookMarked, BookOpen, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import type { EbdQuarter, EbdAudience } from "@/types";

export const metadata = { title: "EBD — Escola Bíblica Dominical" };

const quarterLabel = (q: number) =>
  ["1°", "2°", "3°", "4°"][q - 1] + " Trimestre";

const AUDIENCES: { key: EbdAudience; label: string; color: string; bg: string }[] = [
  { key: "ADULTOS", label: "Adultos · CPAD",  color: "text-iw-blue",  bg: "bg-iw-blue/10"  },
  { key: "JOVENS",  label: "Jovens · CPAD",   color: "text-iw-gold",  bg: "bg-iw-gold/10"  },
];

export default async function EbdPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca todos os trimestres disponíveis
  const { data: allQuarters } = await supabase
    .from("ebd_quarters")
    .select("*")
    .in("audience", ["ADULTOS", "JOVENS"])
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  const quarters = (allQuarters ?? []) as EbdQuarter[];

  // Total de lições por audiência para o stat
  const { count: totalLicoes } = await supabase
    .from("ebd_lessons")
    .select("id", { count: "exact", head: true })
    .in(
      "quarter_id",
      quarters.map((q) => q.id)
    );

  // Lições lidas pelo usuário
  const { count: totalLidas } = await supabase
    .from("ebd_lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Agrupar por audiência → ano → trimestres
  const byAudience = (audience: EbdAudience) => {
    const filtered = quarters.filter((q) => q.audience === audience);
    const byYear = new Map<number, EbdQuarter[]>();
    for (const q of filtered) {
      if (!byYear.has(q.year)) byYear.set(q.year, []);
      byYear.get(q.year)!.push(q);
    }
    return Array.from(byYear.entries()).sort(([a], [b]) => b - a);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-black text-iw-navy tracking-tight">
          EBD — Escola Bíblica Dominical
        </h1>
        <p className="text-iw-muted text-sm">Lições semanais organizadas por trimestre e audiência.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          {
            label: "Trimestres",
            value: quarters.length,
            icon: BookMarked,
            color: "text-iw-blue",
            bg: "bg-iw-blue/10",
          },
          {
            label: "Lições disponíveis",
            value: totalLicoes ?? 0,
            icon: BookOpen,
            color: "text-iw-gold",
            bg: "bg-iw-gold/10",
          },
          {
            label: "Lições lidas",
            value: totalLidas ?? 0,
            icon: Users,
            color: "text-iw-success",
            bg: "bg-iw-success/10",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-iw-muted uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-iw-navy">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {quarters.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm px-6 py-14 text-center">
          <BookMarked className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">
            Nenhum trimestre importado ainda.
          </p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Execute o script <code className="bg-iw-bg px-1 rounded">scripts/import-ebd.ts</code> para popular o banco.
          </p>
        </div>
      ) : (
        /* Seções por audiência */
        AUDIENCES.map(({ key, label, color, bg }) => {
          const yearGroups = byAudience(key);
          if (yearGroups.length === 0) return null;

          return (
            <section key={key}>
              {/* Título da seção */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <BookMarked className={`w-4 h-4 ${color}`} />
                </div>
                <h2 className="font-bold text-iw-navy">{label}</h2>
              </div>

              <div className="space-y-4">
                {yearGroups.map(([year, qs]) => (
                  <div
                    key={year}
                    className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden"
                  >
                    {/* Ano */}
                    <div className="px-5 py-3 border-b border-iw-border bg-iw-bg/40">
                      <span className="text-sm font-bold text-iw-navy">{year}</span>
                    </div>

                    {/* Grid de trimestres */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-iw-border">
                      {/* Preenche os 4 trimestres — mostra "Em breve" se não importado */}
                      {[1, 2, 3, 4].map((qNum) => {
                        const quarter = qs.find((q) => q.quarter === qNum);

                        if (!quarter) {
                          return (
                            <div
                              key={qNum}
                              className="px-5 py-4 opacity-40 select-none"
                            >
                              <p className="text-xs font-semibold text-iw-muted">
                                {quarterLabel(qNum)} · {year}
                              </p>
                              <p className="text-xs text-iw-muted/60 mt-1">
                                Não importado
                              </p>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={qNum}
                            href={`/ebd/${quarter.id}`}
                            className="px-5 py-4 hover:bg-iw-bg/60 transition-colors group flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <p className={`text-xs font-bold ${color}`}>
                                {quarterLabel(quarter.quarter)} · {year}
                              </p>
                              <ChevronRight className="w-3.5 h-3.5 text-iw-muted/30 group-hover:text-iw-muted transition-colors" />
                            </div>
                            {quarter.theme && (
                              <p className="text-xs text-iw-muted leading-tight line-clamp-2">
                                {quarter.theme}
                              </p>
                            )}
                            <p className="text-xs text-iw-muted/50 mt-0.5">
                              {quarter.lesson_count} lições · {quarter.publisher}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
