import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Users, Wallet, Clock, ArrowRight, BarChart3, PiggyBank } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";

export const metadata = { title: "Dashboard — Área do Professor" };

// ============================================================
// /professor — Dashboard (27/09/2026, Fase 1 do Painel do Professor).
// Antes desta Fase, esta rota era a página única inteira (turmas + busca
// + tabela de alunos + parcelas, tudo junto, sem menu lateral) — ver
// histórico em ProfessorPainel.tsx/TurmasDoProfessor.tsx. Virou só um
// resumo com cards, apontando pras telas novas (Alunos, Turmas,
// Financeiro). Cálculo de cada card é enxuto de propósito — cada tela
// de destino já recalcula os dados completos que ela precisa.
//
// 27/09/2026, pedido do Joaquim (mesmo dia): acrescentado um gráfico de
// barras "Alunos por curso" (trocado de "por turma" no mesmo dia, ver
// comentário mais abaixo) e um resumo "Financeiro do mês" (Caixa:
// entradas x saídas; Financeiro: a receber x recebido), escolhido via
// AskUserQuestion entre as opções de expansão do Dashboard. Gráfico é
// CSS puro (sem lib nova) — barras horizontais com largura proporcional
// ao maior valor.
// ============================================================

function BarraHorizontal({ label, valor, max, corBarra }: { label: string; valor: number; max: number; corBarra: string }) {
  const pct = max > 0 ? Math.max((valor / max) * 100, valor > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="w-32 shrink-0 text-xs text-black truncate" title={label}>{label}</p>
      <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
        <div className={`h-full rounded-md ${corBarra}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="w-8 shrink-0 text-xs font-bold text-black text-right">{valor}</p>
    </div>
  );
}

function Card({
  icon: Icon, label, valor, sublinha, href,
}: {
  icon: React.ElementType; label: string; valor: string; sublinha: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:border-iw-gold transition-colors group"
    >
      <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-iw-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-black leading-tight">{valor}</p>
        <p className="text-xs text-black truncate">{sublinha}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-iw-muted/40 group-hover:text-iw-gold shrink-0 transition-colors" />
    </Link>
  );
}

export default async function DashboardDoProfessorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();

  const [{ count: turmasCount }, { data: matriculas }] = await Promise.all([
    admin.from("professor_turmas").select("id", { count: "exact", head: true }).eq("professor_id", professor.id),
    admin.from("ead_matriculas").select("id, course_id, curso_nome_snapshot").eq("professor_id", professor.id),
  ]);

  const matriculaIds = (matriculas ?? []).map((m) => m.id);

  const { data: contas } = matriculaIds.length
    ? await admin
        .from("fin_contas_receber")
        .select("status, valor_bruto_centavos")
        .eq("origem_tipo", "MATRICULA_DIRETA")
        .in("origem_id", matriculaIds)
    : { data: [] };

  const pendentes = (contas ?? []).filter((c) => c.status !== "PAGO");
  const totalPendenteCentavos = pendentes.reduce((acc, c) => acc + c.valor_bruto_centavos, 0);

  const fmtMoeda = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // --- Alunos por curso (27/09/2026, pedido do Joaquim: antes agrupava por
  // turma/course_edition_id, e duas turmas homônimas ("2026 Turma 1") de
  // cursos diferentes apareciam como barras iguais, sem distinção — agrupar
  // pelo curso em si resolve isso). Usa curso_nome_snapshot (já gravado em
  // cada matrícula) como rótulo, sem precisar de outra tabela.
  const contagemPorCurso = new Map<string, number>();
  for (const m of matriculas ?? []) {
    const chave = m.course_id ?? m.curso_nome_snapshot ?? "Curso sem nome";
    contagemPorCurso.set(chave, (contagemPorCurso.get(chave) ?? 0) + 1);
  }
  const nomePorChaveCurso = new Map<string, string>();
  for (const m of matriculas ?? []) {
    const chave = m.course_id ?? m.curso_nome_snapshot ?? "Curso sem nome";
    if (!nomePorChaveCurso.has(chave)) nomePorChaveCurso.set(chave, m.curso_nome_snapshot ?? "Curso sem nome");
  }
  const alunosPorCurso = Array.from(contagemPorCurso.entries())
    .map(([chave, valor]) => ({ label: nomePorChaveCurso.get(chave) ?? "Curso sem nome", valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);
  const maxAlunosPorCurso = Math.max(...alunosPorCurso.map((t) => t.valor), 1);

  // --- Financeiro do mês (Caixa: entradas x saídas; Financeiro: a receber x recebido) ---
  const hoje = new Date();
  const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const primeiroDiaMes = `${anoMes}-01`;
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: parcelasPagasMes } = matriculaIds.length
    ? await admin
        .from("fin_contas_receber")
        .select("valor_bruto_centavos, pago_em")
        .eq("origem_tipo", "MATRICULA_DIRETA")
        .eq("status", "PAGO")
        .in("origem_id", matriculaIds)
        .gte("pago_em", primeiroDiaMes)
        .lte("pago_em", `${ultimoDiaMes}T23:59:59`)
    : { data: [] };
  const { data: parcelasPendentesMes } = matriculaIds.length
    ? await admin
        .from("fin_contas_receber")
        .select("valor_bruto_centavos")
        .eq("origem_tipo", "MATRICULA_DIRETA")
        .neq("status", "PAGO")
        .in("origem_id", matriculaIds)
        .gte("data_vencimento", primeiroDiaMes)
        .lte("data_vencimento", ultimoDiaMes)
    : { data: [] };
  const { data: despesasMes } = await admin
    .from("nucleo_despesas")
    .select("valor_centavos")
    .eq("professor_id", professor.id)
    .gte("data_despesa", primeiroDiaMes)
    .lte("data_despesa", ultimoDiaMes);

  const entradasMesCentavos = (parcelasPagasMes ?? []).reduce((acc, p) => acc + p.valor_bruto_centavos, 0);
  const saidasMesCentavos = (despesasMes ?? []).reduce((acc, d) => acc + d.valor_centavos, 0);
  const aReceberMesCentavos = (parcelasPendentesMes ?? []).reduce((acc, p) => acc + p.valor_bruto_centavos, 0);
  const recebidoMesCentavos = entradasMesCentavos;
  const maxCaixaMes = Math.max(entradasMesCentavos, saidasMesCentavos, 1);
  const maxFinMes = Math.max(aReceberMesCentavos, recebidoMesCentavos, 1);

  // 27/09/2026, pedido do Joaquim: a saudação mostra sempre o primeiro e o
  // último nome (ex.: "Joaquim Mario Soares Coelho" -> "Joaquim Coelho"),
  // não só o primeiro nome como era antes.
  const partesNome = professor.nome_completo.trim().split(/\s+/);
  const nomeSaudacao = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}` : partesNome[0];

  return (
    <div>
      {/* 27/09/2026, pedido do Joaquim: a foto saiu da sidebar (não ficou
          boa ali) e veio pra cá, do lado esquerdo da saudação. */}
      <div className="flex items-center gap-3 mb-1">
        {professor.foto_url && (
          <div className="w-11 h-11 rounded-full overflow-hidden border-[1.5px] border-[#E88D0C]/60 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={professor.foto_url} alt="Sua foto" className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="text-2xl font-black text-black">Olá, {nomeSaudacao}</h1>
      </div>
      <p className="text-black text-sm mb-6">Resumo do seu núcleo de ensino.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          icon={GraduationCap}
          label="Turmas"
          valor={String(turmasCount ?? 0)}
          sublinha="Turmas vinculadas a você"
          href="/professor/turmas"
        />
        <Card
          icon={Users}
          label="Alunos"
          valor={String(matriculaIds.length)}
          sublinha="Alunos matriculados por você"
          href="/professor/alunos"
        />
        <Card
          icon={Clock}
          label="A receber"
          valor={fmtMoeda(totalPendenteCentavos)}
          sublinha={`${pendentes.length} parcela(s) pendente(s)`}
          href="/professor/financeiro"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-iw-gold" />
            <h2 className="text-sm font-bold text-black">Alunos por curso</h2>
          </div>
          {alunosPorCurso.length === 0 ? (
            <p className="text-xs text-black">Nenhum aluno matriculado nas suas turmas ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {alunosPorCurso.map((c, i) => (
                <BarraHorizontal key={`${c.label}-${i}`} label={c.label} valor={c.valor} max={maxAlunosPorCurso} corBarra="bg-iw-gold" />
              ))}
            </div>
          )}
        </div>

        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-iw-gold" />
            <h2 className="text-sm font-bold text-black">Financeiro do mês</h2>
          </div>

          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider mb-1.5">Caixa</p>
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">Entradas</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-iw-success" style={{ width: `${Math.max((entradasMesCentavos / maxCaixaMes) * 100, entradasMesCentavos > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmtMoeda(entradasMesCentavos)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">Saídas</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-iw-error" style={{ width: `${Math.max((saidasMesCentavos / maxCaixaMes) * 100, saidasMesCentavos > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmtMoeda(saidasMesCentavos)}</p>
            </div>
          </div>

          <p className="text-[10px] font-extrabold text-black uppercase tracking-wider mb-1.5">Financeiro (parcelas do mês)</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">A receber</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-amber-500" style={{ width: `${Math.max((aReceberMesCentavos / maxFinMes) * 100, aReceberMesCentavos > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmtMoeda(aReceberMesCentavos)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-xs text-black">Recebido</p>
              <div className="flex-1 h-5 rounded-md bg-iw-bg overflow-hidden">
                <div className="h-full rounded-md bg-iw-success" style={{ width: `${Math.max((recebidoMesCentavos / maxFinMes) * 100, recebidoMesCentavos > 0 ? 4 : 0)}%` }} />
              </div>
              <p className="w-24 shrink-0 text-xs font-bold text-black text-right">{fmtMoeda(recebidoMesCentavos)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-iw-gold" />
          <h2 className="text-sm font-bold text-black">Próximos passos</h2>
        </div>
        <p className="text-xs text-black">
          Use o menu ao lado para gerenciar suas turmas, matricular ou consultar alunos, e acompanhar as
          parcelas do seu núcleo.
        </p>
      </div>
    </div>
  );
}
