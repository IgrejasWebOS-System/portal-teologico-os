// ============================================================
// Gráfico de colunas por ano (CSS puro, server component) — usado no
// Dashboard "Todos os anos" (18/10/2026). Cada coluna é um ano; a altura é
// proporcional ao maior valor da série.
// ============================================================

export interface PontoAnual {
  ano: number;
  valor: number;
}

export default function ComparativoAnual({
  titulo,
  serie,
  formatValue,
  corBarra = "bg-iw-gold",
}: {
  titulo: string;
  serie: PontoAnual[];
  formatValue?: (v: number) => string;
  corBarra?: string;
}) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("pt-BR"));
  const max = Math.max(1, ...serie.map((p) => p.valor));
  const total = serie.reduce((a, p) => a + p.valor, 0);

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h2 className="font-bold text-iw-navy text-sm">{titulo}</h2>
        <span className="text-xs text-iw-muted">Total: <strong className="text-iw-navy">{fmt(total)}</strong></span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-iw-muted py-6 text-center">Sem dados no período.</p>
      ) : (
        <div className="flex items-end gap-3 h-44">
          {serie.map((p) => (
            <div key={p.ano} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span className="text-[11px] font-semibold text-iw-navy mb-1 truncate max-w-full">{fmt(p.valor)}</span>
              <div
                className={`w-full rounded-t-lg ${corBarra}`}
                style={{ height: `${Math.max(p.valor > 0 ? 3 : 0, Math.round((p.valor / max) * 100))}%` }}
                title={`${p.ano}: ${fmt(p.valor)}`}
              />
              <span className="text-xs font-bold text-iw-muted mt-1">{p.ano}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
