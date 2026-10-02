import Link from "next/link";
import { BookUser, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import AlunosListClient from "./AlunosListClient";

type Row = {
  id: string;
  nome_completo: string;
  matricula: string;
  status: string;
  curso_pretendido: string | null;
  telefone: string | null;
  campo_ministerio_nome: string | null;
  sector_id: string | null;
  church_id: string | null;
  sectors: { name: string; categoria: string | null } | null;
  churches: { name: string; is_sede: boolean | null } | null;
};

export default async function AlunosPage() {
  const supabase = await createClient();

  const [{ data }, { data: setores }] = await Promise.all([
    supabase
      .from("ead_alunos")
      .select(
        "id, nome_completo, matricula, status, curso_pretendido, telefone, campo_ministerio_nome, sector_id, church_id, sectors(name, categoria), churches(name, is_sede)"
      )
      .order("nome_completo"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  const rows = (data ?? []) as unknown as Row[];

  // 02/10/2026, pedido do Joaquim: mesmo padrão de Professores (page.tsx) —
  // na linha do título, além da quantidade total, mostrar o total quebrado
  // por Sede/Setor/Regional.
  let totalSede = 0;
  let totalSetor = 0;
  let totalRegional = 0;
  for (const r of rows) {
    if (r.churches?.is_sede) totalSede += 1;
    else if (r.sectors?.categoria === "REGIONAL") totalRegional += 1;
    else totalSetor += 1;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={BookUser}
        title="Aluno"
        description={
          <>
            <span className="text-lg font-black text-black">{rows.length}</span> aluno
            {rows.length === 1 ? "" : "s"} matriculado{rows.length === 1 ? "" : "s"} na Escola de Teologia.
          </>
        }
        backHref="/dashboard/configuracoes/persona"
        backLabel="Voltar para Persona"
        backNovoPadrao
        actions={
          <Link
            href="/admin/matriculas/nova"
            className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Nova Matrícula
          </Link>
        }
        extra={
          <p>
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              SEDE
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalSede}
            </span>{" "}
            ·{" "}
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              SETOR
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalSetor}
            </span>{" "}
            ·{" "}
            <span
              className="text-[20px] font-black uppercase text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              REGIONAL
            </span>
            :{" "}
            <span
              className="text-[22px] font-black text-black"
              style={{ fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" }}
            >
              {totalRegional}
            </span>
          </p>
        }
      />

      {rows.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Nenhum aluno cadastrado.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Alunos são criados via matrícula (pública, direta ou auto-matrícula).
          </p>
        </div>
      ) : (
        <AlunosListClient rows={rows} setores={setores ?? []} />
      )}
    </div>
  );
}
