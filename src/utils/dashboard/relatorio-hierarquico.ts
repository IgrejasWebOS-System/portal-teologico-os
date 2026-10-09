// ============================================================
// Monta a árvore do "Relatório Global" do Dashboard (/admin) —
// 08/10/2026, pedido do Joaquim (base: Relatório Cetadp Setembro 2026).
//
//   SEDE → Turma → Aluno
//   SETOR/REGIONAL → Setor/Regional → Igreja → Turma → Aluno
//
// Função pura (sem acesso a banco): a página busca os dados e passa
// para cá. Matrículas CANCELADAS ficam de fora (não são alunos ativos
// nem geram valor a receber). Turmas do ano SEM alunos entram com zeros
// (`turmasSemAluno`), para o Dashboard listar as mesmas regionais,
// setores e igrejas da tela de Turmas.
// ============================================================

export type Agg = {
  basico: number;
  medio: number;
  vBasico: number; // centavos (soma das parcelas das matrículas do Básico)
  vMedio: number; // centavos
  pago: number; // centavos
};
export type NoAluno = { nome: string } & Agg;
export type NoTurma = { nome: string; alunos: NoAluno[] } & Agg;
export type NoIgreja = { nome: string; turmas: NoTurma[] } & Agg;
export type NoGrupo = { nome: string; igrejas: NoIgreja[] } & Agg;

export interface RelatorioGlobalDados {
  sede: { turmas: NoTurma[] } & Agg;
  setores: NoGrupo[];
  setorTotal: Agg;
  regionais: NoGrupo[];
  regionalTotal: Agg;
  geral: Agg;
}

export interface AlunoInfo {
  nome_completo: string | null;
  sector_id: string | null;
  sectors: { name: string } | null;
  churches: { name: string; is_sede: boolean | null } | null;
}

export interface MatriculaInfo {
  id: string;
  aluno_id: string;
  status: string | null;
  curso_nome_snapshot: string | null;
  course_edition_id: string | null;
}

// Turma do ano que ainda não tem nenhum aluno ativo.
export interface TurmaSemAluno {
  tipo: "SEDE" | "SETOR" | "REGIONAL";
  setor: string | null; // nome do Setor/Regional pai (null na Sede)
  igreja: string; // nome da igreja (unidade) da turma
  turma: string;
}

const vazio = (): Agg => ({ basico: 0, medio: 0, vBasico: 0, vMedio: 0, pago: 0 });

function somar(a: Agg, b: Agg) {
  a.basico += b.basico;
  a.medio += b.medio;
  a.vBasico += b.vBasico;
  a.vMedio += b.vMedio;
  a.pago += b.pago;
}

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

export function montarRelatorioGlobal(params: {
  matriculas: MatriculaInfo[];
  alunos: Map<string, AlunoInfo>;
  financeiroPorMatricula: Map<string, { aPagar: number; pago: number }>;
  nomeTurmaPorEdicao: Map<string, string>;
  turmasSemAluno?: TurmaSemAluno[];
}): RelatorioGlobalDados {
  const { matriculas, alunos, financeiroPorMatricula, nomeTurmaPorEdicao, turmasSemAluno = [] } = params;

  type TurmaMut = NoTurma;
  type IgrejaMut = NoIgreja & { _turmas: Map<string, TurmaMut> };
  type GrupoMut = NoGrupo & { _igrejas: Map<string, IgrejaMut>; _tipo: "SETOR" | "REGIONAL" };

  const sedeTurmas = new Map<string, TurmaMut>();
  const grupos = new Map<string, GrupoMut>();
  const sede = { ...vazio(), turmas: [] as NoTurma[] };

  const turmaEm = (mapa: Map<string, TurmaMut>, nome: string) => {
    let t = mapa.get(nome);
    if (!t) {
      t = { nome, alunos: [], ...vazio() };
      mapa.set(nome, t);
    }
    return t;
  };
  const grupoEm = (nome: string, tipo: "SETOR" | "REGIONAL") => {
    let g = grupos.get(nome);
    if (!g) {
      g = { nome, igrejas: [], _igrejas: new Map(), _tipo: tipo, ...vazio() };
      grupos.set(nome, g);
    }
    return g;
  };
  const igrejaEm = (g: GrupoMut, nome: string) => {
    let ig = g._igrejas.get(nome);
    if (!ig) {
      ig = { nome, turmas: [], _turmas: new Map(), ...vazio() };
      g._igrejas.set(nome, ig);
    }
    return ig;
  };

  for (const m of matriculas) {
    if (m.status === "CANCELADO") continue;

    const aluno = alunos.get(m.aluno_id);
    const curso = (m.curso_nome_snapshot ?? "").toLowerCase();
    const ehBasico = curso.includes("básico") || curso.includes("basico");
    const ehMedio = curso.includes("médio") || curso.includes("medio");
    const fin = financeiroPorMatricula.get(m.id);
    const valor = fin?.aPagar ?? 0;
    const pago = fin?.pago ?? 0;

    const contrib: Agg = {
      basico: ehBasico ? 1 : 0,
      medio: ehMedio ? 1 : 0,
      vBasico: ehBasico ? valor : 0,
      vMedio: ehMedio ? valor : 0,
      pago,
    };
    const noAluno: NoAluno = { nome: aluno?.nome_completo ?? "—", ...contrib };
    const nomeTurma = (m.course_edition_id && nomeTurmaPorEdicao.get(m.course_edition_id)) || "Sem turma definida";

    if (aluno?.churches?.is_sede) {
      const t = turmaEm(sedeTurmas, nomeTurma);
      t.alunos.push(noAluno);
      somar(t, contrib);
      somar(sede, contrib);
      continue;
    }

    const setorNome = aluno?.sectors?.name ?? "Sem setor definido";
    const tipo: "SETOR" | "REGIONAL" = setorNome.toUpperCase().startsWith("REGIONAL") ? "REGIONAL" : "SETOR";
    const g = grupoEm(setorNome, tipo);
    const ig = igrejaEm(g, aluno?.churches?.name ?? "Sem igreja definida");
    const t = turmaEm(ig._turmas, nomeTurma);
    t.alunos.push(noAluno);
    somar(t, contrib);
    somar(ig, contrib);
    somar(g, contrib);
  }

  // Turmas do ano sem alunos: entram com zeros (não alteram nenhum total).
  for (const v of turmasSemAluno) {
    if (v.tipo === "SEDE") {
      turmaEm(sedeTurmas, v.turma);
      continue;
    }
    const g = grupoEm(v.setor ?? "Sem setor definido", v.tipo);
    const ig = igrejaEm(g, v.igreja);
    turmaEm(ig._turmas, v.turma);
  }

  const finalizarTurmas = (mapa: Map<string, TurmaMut>) =>
    Array.from(mapa.values())
      .map((t) => ({ ...t, alunos: [...t.alunos].sort(porNome) }))
      .sort(porNome);

  sede.turmas = finalizarTurmas(sedeTurmas);

  const todos = Array.from(grupos.values()).map((g) => ({
    tipo: g._tipo,
    grupo: {
      nome: g.nome,
      basico: g.basico,
      medio: g.medio,
      vBasico: g.vBasico,
      vMedio: g.vMedio,
      pago: g.pago,
      igrejas: Array.from(g._igrejas.values())
        .map((ig) => ({
          nome: ig.nome,
          basico: ig.basico,
          medio: ig.medio,
          vBasico: ig.vBasico,
          vMedio: ig.vMedio,
          pago: ig.pago,
          turmas: finalizarTurmas(ig._turmas),
        }))
        .sort(porNome),
    } as NoGrupo,
  }));

  const setores = todos.filter((x) => x.tipo === "SETOR").map((x) => x.grupo).sort(porNome);
  const regionais = todos.filter((x) => x.tipo === "REGIONAL").map((x) => x.grupo).sort(porNome);

  const setorTotal = vazio();
  setores.forEach((s) => somar(setorTotal, s));
  const regionalTotal = vazio();
  regionais.forEach((r) => somar(regionalTotal, r));
  const geral = vazio();
  somar(geral, sede);
  somar(geral, setorTotal);
  somar(geral, regionalTotal);

  return { sede, setores, setorTotal, regionais, regionalTotal, geral };
}
