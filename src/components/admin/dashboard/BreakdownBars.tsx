// ============================================================
// Lista de barras horizontais (CSS puro) — usada para "quebras"
// (matrículas por curso, origem da matrícula, status das contas
// a receber). Ordena por valor decrescente automaticamente.
// ============================================================

interface Item {
  label: string;
  value: number;
  color?: string;
}

export default function BreakdownBars({
  data,
  formatValue,
  emptyLabel = "Sem dados no período.",
}: {
  data: Item[];
  formatValue?: (v: number) => string;
  emptyLabel?: string;
}) {
  const ordenado = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...ordenado.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));

  if (ordenado.every((d) => d.value === 0)) {
    return <p className="text-sm text-iw-muted py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {ordenado.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-iw-navy truncate pr-2">{d.label}</span>
            <span className="text-iw-muted font-medium shrink-0">{fmt(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-iw-border overflow-hidden">
            <div
              className={`h-full rounded-full ${d.color ?? "bg-iw-gold"}`}
              style={{ width: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
