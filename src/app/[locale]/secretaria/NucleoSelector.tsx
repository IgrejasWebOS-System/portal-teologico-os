"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import type { NucleoOption } from "@/utils/secretaria";

// ============================================================
// Seletor de núcleo (04/10/2026) — "Todos os núcleos" (visão agregada
// de tudo que o secretário acessa) ou uma igreja específica. Estado
// mora na URL (?nucleo=<churchId>), não em client state solto, pra cada
// página (Dashboard, Alunos, ...) poder ler o mesmo valor server-side
// sem precisar de um Context novo.
// ============================================================

export default function NucleoSelector({ nucleos }: { nucleos: NucleoOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selecionado = searchParams.get("nucleo") ?? "";

  function onChange(churchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (churchId) {
      params.set("nucleo", churchId);
    } else {
      params.delete("nucleo");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (nucleos.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-iw-surface border border-iw-border rounded-xl px-4 py-2.5 shadow-sm w-fit shrink-0">
      <Building2 className="w-4 h-4 text-iw-gold shrink-0" />
      <label className="text-xs font-bold text-black uppercase tracking-wider shrink-0">Núcleo</label>
      <select
        value={selecionado}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm font-medium text-black bg-transparent border-none outline-none cursor-pointer"
      >
        <option value="">Todos os núcleos</option>
        {nucleos.map((n) => (
          <option key={n.churchId} value={n.churchId}>
            {n.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
