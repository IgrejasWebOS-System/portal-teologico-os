// ============================================================
// RankingBars — gráfico de barras horizontais simples (CSS puro, sem
// biblioteca de gráficos) pra ranquear itens por contagem. Decisão do
// Joaquim em 13/09/2026: usado no Relatório por Território pra mostrar
// as igrejas com mais matrículas, por Setor e por Regional. Escolhido
// nativo (mesmo padrão dos certificados/impressão) pra não adicionar
// dependência nova só por causa de 2 gráficos simples.
// ============================================================

export interface RankingBarItem {
  name: string;
  total: number;
}

export default function RankingBars({
  titulo,
  itens,
  vazio = "Sem matrículas suficientes ainda.",
}: {
  titulo: string;
  itens: RankingBarItem[];
  vazio?: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i.total));

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm space-y-3">
      <p className="text-sm font-bold text-iw-navy">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-xs text-iw-muted">{vazio}</p>
      ) : (
        <div className="space-y-2.5">
          {itens.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-iw-navy truncate">{item.name}</span>
                <span className="font-bold text-iw-navy shrink-0">
                  {item.total} matrícula{item.total === 1 ? "" : "s"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-iw-bg overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#CF8403]"
                  style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
