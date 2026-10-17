// ============================================================
// Linha de totais "TOTAL DE X | COMPOSIÇÃO  SEDE: n  SETOR: n  REGIONAL: n"
// (16/10/2026, pedido do Joaquim: mesmo layout em Turmas, Alunos e
// Professores). Rótulos na fonte do título (Cinzel, via --font-merriweather);
// números em destaque. Sem estado: serve para Server e Client Components.
// ============================================================

const cinzel = { fontFamily: "var(--font-merriweather), 'Cinzel', Georgia, serif" };

const rotuloCls = "text-xs font-bold uppercase tracking-wider text-black";
const valorCls = "text-[22px] font-black text-black leading-none";

function Divisor() {
  return <span aria-hidden className="hidden sm:block w-px h-6 bg-iw-border" />;
}

function Item({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={rotuloCls} style={cinzel}>{rotulo}:</span>
      <span className={valorCls} style={cinzel}>{valor}</span>
    </span>
  );
}

export function TotaisComposicao({
  rotuloTotal,
  total,
  sede,
  setor,
  regional,
}: {
  rotuloTotal: string;
  total: number;
  sede: number;
  setor: number;
  regional: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="inline-flex items-baseline gap-2">
        <span className={rotuloCls} style={cinzel}>{rotuloTotal}</span>
        <span className={valorCls} style={cinzel}>{total}</span>
      </span>
      <Divisor />
      <span className={rotuloCls} style={cinzel}>Composição</span>
      <Item rotulo="SEDE" valor={sede} />
      <Item rotulo="SETOR" valor={setor} />
      <Item rotulo="REGIONAL" valor={regional} />
    </div>
  );
}

/** Mesmo conteúdo dentro do cartão de borda dourada (abaixo da linha de busca). */
export function CartaoTotais(props: React.ComponentProps<typeof TotaisComposicao>) {
  return (
    <div className="bg-iw-surface border border-iw-gold rounded-2xl px-6 py-5">
      <TotaisComposicao {...props} />
    </div>
  );
}

/** Classifica uma linha em SEDE / REGIONAL / SETOR (mesmo critério das telas). */
export function contarComposicao(
  rows: { churches?: { is_sede: boolean | null } | null; sectors?: { categoria: string | null } | null }[]
) {
  let sede = 0;
  let setor = 0;
  let regional = 0;
  for (const r of rows) {
    if (r.churches?.is_sede) sede += 1;
    else if (r.sectors?.categoria === "REGIONAL") regional += 1;
    else setor += 1;
  }
  return { total: rows.length, sede, setor, regional };
}
