"use client";

import { usePathname, useRouter } from "next/navigation";

// ============================================================
// Caixa seletora "ANO" do Dashboard (10/10/2026, pedido do Joaquim): troca o
// parâmetro ?ano= na URL e a página (server component) recarrega todos os
// números daquele ano.
// ============================================================

export default function SeletorAno({ anoSelecionado, anos }: { anoSelecionado: number; anos: number[] }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-xs font-bold text-iw-navy uppercase tracking-wider">
      ANO
      <select
        value={anoSelecionado}
        onChange={(e) => router.push(`${pathname}?ano=${e.target.value}`)}
        className="text-xs font-semibold text-iw-navy bg-iw-surface border border-iw-border rounded-lg px-2 py-1 focus:outline-none focus:border-iw-gold normal-case tracking-normal"
      >
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}
