// ============================================================
// Gráfico de barras verticais simples (CSS puro, sem dependência
// nova) — usado para tendências mês a mês (matrículas, receita).
// Componente de servidor: não tem interatividade, só divs.
// ============================================================

interface Ponto {
  label: string;
  value: number;
}

export default function MonthlyBarChart({
  data,
  color = "bg-iw-blue",
  formatValue,
}: {
  data: Ponto[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className="flex items-end justify-between gap-2 h-40 px-1">
      {data.map((d) => {
        const alturaPct = d.value === 0 ? 2 : Math.max(4, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group">
            <span className="text-[11px] font-bold text-iw-navy opacity-0 group-hover:opacity-100 transition-opacity">
              {fmt(d.value)}
            </span>
            <div
              className={`w-full max-w-[36px] rounded-t-md ${color} transition-all`}
              style={{ height: `${alturaPct}%` }}
              title={`${d.label}: ${fmt(d.value)}`}
            />
            <span className="text-[11px] text-iw-muted font-medium">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
