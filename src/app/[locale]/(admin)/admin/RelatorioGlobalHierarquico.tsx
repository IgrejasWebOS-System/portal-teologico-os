import type { ReactNode } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import type { Agg, NoGrupo, NoTurma, RelatorioGlobalDados } from "@/utils/dashboard/relatorio-hierarquico";

// ============================================================
// Relatório Global hierárquico do Dashboard (08/10/2026, pedido do
// Joaquim, com base no "Relatório Cetadp Setembro 2026" em PDF).
//
//   SEDE      → Turma → Aluno
//   SETOR     → Setor → Igreja → Turma → Aluno
//   REGIONAL  → Regional → Igreja → Turma → Aluno
//
// Cada linha traz Básico e Médio lado a lado (nº de alunos e valor) e o
// total (alunos e valor). "Valor" = soma das parcelas (contas a receber)
// das matrículas daquele nível; "Pago" e "Saldo devedor" saem das mesmas
// parcelas. Componente de servidor: o abre/fecha é <details> nativo.
// ============================================================

// Nome | Básico | Valor | Médio | Valor | Total | Valor total | Pago | Saldo
const COLS = "grid-cols-[2.2fr_0.6fr_1fr_0.6fr_1fr_0.6fr_1.1fr_1fr_1fr]";

// Uma classe de "group" por nível (literais, para o Tailwind enxergar):
// assim a seta de um nível só gira quando o PRÓPRIO nível está aberto.
const NIVEIS = [
  { grupo: "group/n0", seta: "group-open/n0:rotate-90" },
  { grupo: "group/n1", seta: "group-open/n1:rotate-90" },
  { grupo: "group/n2", seta: "group-open/n2:rotate-90" },
  { grupo: "group/n3", seta: "group-open/n3:rotate-90" },
] as const;

function fmt(centavos: number) {
  return centavos > 0
    ? (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
}

function Valores({ agg, tam }: { agg: Agg; tam: string }) {
  const totalAlunos = agg.basico + agg.medio;
  const totalValor = agg.vBasico + agg.vMedio;
  const saldo = totalValor - agg.pago;
  return (
    <>
      <span className={`text-right text-iw-muted ${tam}`}>{agg.basico || "—"}</span>
      <span className={`text-right text-iw-muted ${tam}`}>{fmt(agg.vBasico)}</span>
      <span className={`text-right text-iw-muted ${tam}`}>{agg.medio || "—"}</span>
      <span className={`text-right text-iw-muted ${tam}`}>{fmt(agg.vMedio)}</span>
      <span className={`text-right font-bold text-iw-navy ${tam}`}>{totalAlunos || "—"}</span>
      <span className={`text-right font-bold text-iw-navy ${tam}`}>{fmt(totalValor)}</span>
      <span className={`text-right text-iw-success ${tam}`}>{fmt(agg.pago)}</span>
      <span className={`text-right font-bold text-iw-error ${tam}`}>{saldo !== 0 ? fmt(saldo) : "—"}</span>
    </>
  );
}

function Cabecalho() {
  const th = "text-[10px] font-extrabold text-iw-muted uppercase tracking-wider text-right";
  return (
    <div className={`grid ${COLS} gap-2 items-center pb-2 border-b border-iw-border`}>
      <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider inline-flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-iw-gold" />
        Relatório Global
      </span>
      <span className={th}>Básico</span>
      <span className={th}>Valor</span>
      <span className={th}>Médio</span>
      <span className={th}>Valor</span>
      <span className={th}>Total</span>
      <span className={th}>Valor total</span>
      <span className={th}>Pago</span>
      <span className={th}>Saldo devedor</span>
    </div>
  );
}

function Linha({
  nome,
  agg,
  nivel,
  detalhe,
}: {
  nome: string;
  agg: Agg;
  nivel: number;
  detalhe?: string;
}) {
  const tam = nivel === 0 ? "text-sm" : nivel === 1 ? "text-xs" : "text-[11px]";
  return (
    <div
      className={`grid ${COLS} gap-2 items-center py-1.5 border-t border-iw-border/40`}
      style={{ paddingLeft: nivel * 20 + 4 }}
    >
      <span className={`truncate text-iw-muted ${tam}`}>
        {nome}
        {detalhe && <span className="ml-1.5 text-[10px] text-iw-muted/70">{detalhe}</span>}
      </span>
      <Valores agg={agg} tam={tam} />
    </div>
  );
}

function Bloco({
  nome,
  agg,
  nivel,
  detalhe,
  children,
}: {
  nome: string;
  agg: Agg;
  nivel: number;
  detalhe?: string;
  children: ReactNode;
}) {
  const n = NIVEIS[Math.min(nivel, NIVEIS.length - 1)];
  const tam = nivel === 0 ? "text-sm" : nivel === 1 ? "text-xs" : "text-[11px]";
  return (
    <details className={`${n.grupo} border-t border-iw-border/40`}>
      <summary
        className={`cursor-pointer list-none grid ${COLS} gap-2 items-center py-2 hover:bg-iw-bg/50`}
        style={{ paddingLeft: nivel * 20 + 4 }}
      >
        <span className={`truncate font-semibold text-iw-navy inline-flex items-center gap-1.5 ${tam}`}>
          <ChevronRight className={`w-3.5 h-3.5 text-iw-muted transition-transform shrink-0 ${n.seta}`} />
          {nome}
          {detalhe && <span className="text-[10px] font-normal text-iw-muted">{detalhe}</span>}
        </span>
        <Valores agg={agg} tam={tam} />
      </summary>
      <div className="bg-iw-bg/40">{children}</div>
    </details>
  );
}

function plural(n: number, um: string, varios: string) {
  return `(${n} ${n === 1 ? um : varios})`;
}

function ListaTurmas({ turmas, nivel }: { turmas: NoTurma[]; nivel: number }) {
  if (turmas.length === 0) {
    return <p className="text-xs text-iw-muted py-2" style={{ paddingLeft: nivel * 20 + 4 }}>Nenhuma turma.</p>;
  }
  return (
    <>
      {turmas.map((t) => (
        <Bloco key={t.nome} nome={t.nome} agg={t} nivel={nivel} detalhe={plural(t.alunos.length, "aluno", "alunos")}>
          {t.alunos.map((a, i) => (
            <Linha key={`${a.nome}-${i}`} nome={a.nome} agg={a} nivel={nivel + 1} />
          ))}
        </Bloco>
      ))}
    </>
  );
}

function ListaGrupos({ grupos, vazio }: { grupos: NoGrupo[]; vazio: string }) {
  if (grupos.length === 0) {
    return <p className="text-xs text-iw-muted py-2 pl-6">{vazio}</p>;
  }
  return (
    <>
      {grupos.map((g) => (
        <Bloco key={g.nome} nome={g.nome} agg={g} nivel={1} detalhe={plural(g.igrejas.length, "igreja", "igrejas")}>
          {g.igrejas.map((ig) => (
            <Bloco key={ig.nome} nome={ig.nome} agg={ig} nivel={2} detalhe={plural(ig.turmas.length, "turma", "turmas")}>
              <ListaTurmas turmas={ig.turmas} nivel={3} />
            </Bloco>
          ))}
        </Bloco>
      ))}
    </>
  );
}

export default function RelatorioGlobalHierarquico({ dados }: { dados: RelatorioGlobalDados }) {
  const g = dados.geral;
  return (
    <div className="bg-iw-surface border border-iw-gold rounded-2xl p-6">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <Cabecalho />

          <Bloco nome="SEDE" agg={dados.sede} nivel={0} detalhe={plural(dados.sede.turmas.length, "turma", "turmas")}>
            <ListaTurmas turmas={dados.sede.turmas} nivel={1} />
          </Bloco>

          <Bloco nome="SETOR" agg={dados.setorTotal} nivel={0} detalhe={plural(dados.setores.length, "setor", "setores")}>
            <ListaGrupos grupos={dados.setores} vazio="Nenhum setor com matrículas." />
          </Bloco>

          <Bloco
            nome="REGIONAL"
            agg={dados.regionalTotal}
            nivel={0}
            detalhe={plural(dados.regionais.length, "regional", "regionais")}
          >
            <ListaGrupos grupos={dados.regionais} vazio="Nenhuma regional com matrículas." />
          </Bloco>

          <div className={`grid ${COLS} gap-2 items-center py-2.5 border-t border-iw-border`} style={{ paddingLeft: 4 }}>
            <span className="text-sm font-black text-iw-navy uppercase">Total geral</span>
            <Valores agg={g} tam="text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
