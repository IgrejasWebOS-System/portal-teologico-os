import Link from "next/link";
import { BookUser, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import { TotaisComposicao, contarComposicao } from "@/components/layout/TotaisComposicao";
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

const SELECT_ALUNO =
  "id, nome_completo, matricula, status, curso_pretendido, telefone, campo_ministerio_nome, sector_id, church_id, sectors(name, categoria), churches(name, is_sede)";

// 16/10/2026, pedido do Joaquim: filtro de ANO na mesma linha da busca. O ano
// vale pelo ano da TURMA (course_editions.ano) em que o aluno tem matrícula.
// Sem ?ano= abre no ano corrente (hoje todos os alunos estão em turmas de
// 2026, então a lista inicial é a mesma de antes); ?ano= vazio = todos os anos.
// A busca é paginada de 1000 em 1000 porque o PostgREST corta em 1000 linhas
// e o histórico migrado (2022+) passa disso.
export default async function AlunosPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { ano: anoParam } = await searchParams;
  const ano = anoParam !== undefined ? anoParam : String(new Date().getFullYear());
  const supabase = await createClient();

  const [{ data: edicoes }, { data: setores }] = await Promise.all([
    supabase.from("course_editions").select("ano"),
    supabase.from("sectors").select("id, name").order("name"),
  ]);

  const anosDisponiveis = Array.from(
    new Set(((edicoes ?? []) as { ano: number | null }[]).map((e) => e.ano).filter((a): a is number => !!a))
  ).sort((a, b) => b - a);

  const PAGINA = 1000;
  const todos: unknown[] = [];
  for (let de = 0; ; de += PAGINA) {
    const base = supabase
      .from("ead_alunos")
      .select(ano ? `${SELECT_ALUNO}, ead_matriculas!inner(course_editions!inner(ano))` : SELECT_ALUNO);
    const filtrado = ano ? base.eq("ead_matriculas.course_editions.ano", Number(ano)) : base;
    const { data: pagina } = await filtrado.order("nome_completo").order("id").range(de, de + PAGINA - 1);
    if (!pagina || pagina.length === 0) break;
    todos.push(...pagina);
    if (pagina.length < PAGINA) break;
  }

  const rows = todos as unknown as Row[];

  // 02/10/2026, pedido do Joaquim: mesmo padrão de Professores (page.tsx) —
  // na linha do título, além da quantidade total, mostrar o total quebrado
  // por Sede/Setor/Regional. 16/10/2026: o título mostra o total GERAL (todos
  // os anos, como em Turmas); o cartão abaixo da busca mostra o do ano
  // escolhido (calculado no AlunosListClient).
  let linhasGerais: Row[] = rows;
  if (ano) {
    const leves: unknown[] = [];
    for (let de = 0; ; de += PAGINA) {
      const { data: pagina } = await supabase
        .from("ead_alunos")
        .select("id, sectors(categoria), churches(is_sede)")
        .order("id")
        .range(de, de + PAGINA - 1);
      if (!pagina || pagina.length === 0) break;
      leves.push(...pagina);
      if (pagina.length < PAGINA) break;
    }
    linhasGerais = leves as unknown as Row[];
  }
  const totaisGerais = contarComposicao(linhasGerais);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={BookUser}
        title="Aluno"
        description={
          <>
            <span className="text-lg font-black text-black">{rows.length}</span> aluno
            {rows.length === 1 ? "" : "s"} matriculado{rows.length === 1 ? "" : "s"} na Escola de Teologia
            {ano ? ` em ${ano}` : ""}.
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
          <TotaisComposicao
            rotuloTotal="Total de alunos"
            total={totaisGerais.total}
            sede={totaisGerais.sede}
            setor={totaisGerais.setor}
            regional={totaisGerais.regional}
          />
        }
      />

      {rows.length === 0 && !ano ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Nenhum aluno cadastrado.</p>
          <p className="text-iw-muted/60 text-xs mt-1">
            Alunos são criados via matrícula (pública, direta ou auto-matrícula).
          </p>
        </div>
      ) : (
        <AlunosListClient rows={rows} setores={setores ?? []} anos={anosDisponiveis} ano={ano} />
      )}
    </div>
  );
}
