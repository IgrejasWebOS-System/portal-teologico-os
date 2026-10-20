"use client";

import { usePathname, useRouter } from "next/navigation";

// ============================================================
// Caixa seletora "ANO" do Dashboard (10/10/2026, pedido do Joaquim): troca o
// parâmetro ?ano= na URL e a página (server component) recarrega todos os
// números daquele ano. 18/10/2026: fica no cabeçalho da página (extremidade
// direita) e ganhou a opção "Todos" (?ano=todos): totais e comparativo anual.
// ============================================================

export default function SeletorAno({ anoSelecionado, anos }: { anoSelecionado: number | "todos"; anos: number[] }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-black normal-case tracking-normal align-middle">
      Selecionar o ano
      <select
        value={anoSelecionado}
        onChange={(e) => router.push(`${pathname}?ano=${e.target.value}`)}
        className="text-xs font-semibold text-iw-navy bg-iw-surface border border-iw-border rounded-lg px-2 py-1 focus:outline-none focus:border-iw-gold normal-case tracking-normal"
      >
        <option value="todos">Todos</option>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}
