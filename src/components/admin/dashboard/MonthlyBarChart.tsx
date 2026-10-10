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
  compacto = false,
}: {
  data: Ponto[];
  color?: string;
  formatValue?: (v: number) => string;
  // Muitas barras (ex.: 31 dias): menos espaço e rótulo menor.
  compacto?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className={`flex items-end justify-between ${compacto ? "gap-0.5" : "gap-2"} h-40 px-1`}>
      {data.map((d) => {
        const alturaPct = d.value === 0 ? 2 : Math.max(4, Math.round((d.value / max) * 100));
        return (
          // min-w-0: a coluna nunca cresce por causa do texto (antes o valor "R$ ..."
          // escondido alargava as colunas e o gráfico anual estourava o card).
          <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5 group">
            <div
              className={`relative w-full ${compacto ? "max-w-[14px]" : "max-w-[36px]"} rounded-t-md ${color} transition-all`}
              style={{ height: `${alturaPct}%` }}
              title={`${d.label}: ${fmt(d.value)}`}
            >
              {/* Valor aparece ao passar o mouse, flutuando sobre a barra (sem ocupar largura). */}
              <span
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap pointer-events-none ${
                  compacto ? "text-[12px]" : "text-[14px]"
                } font-bold text-iw-navy opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                {fmt(d.value)}
              </span>
            </div>
            <span className={`${compacto ? "text-[12px]" : "text-[14px]"} text-iw-muted font-medium max-w-full truncate`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
