"use client";

import { useMemo, useState } from "react";
import type { TurmaPresenca } from "@/utils/presenca-contexto";

// Seletor em cascata: Tipo (Sede/Setor/Regional) -> Setor/Regional -> Núcleo/Turma.
// Só filtra a lista no navegador; o envio é um GET comum com ?turma=<id>.

const ROTULO: Record<string, string> = { SEDE: "Sede", SETOR: "Setor", REGIONAL: "Regional", OUTRO: "Outros" };
const input = "mt-1 w-full border border-iw-border rounded-lg px-3 py-2 text-sm font-normal bg-white";

export default function SeletorTurma({
  turmas,
  turmaId,
  aba,
  basePath,
  simples = false,
}: {
  turmas: TurmaPresenca[];
  turmaId: string;
  aba: string;
  basePath: string;
  // Professor: já está vinculado às próprias turmas, então só escolhe a turma (sem Tipo/Setor).
  simples?: boolean;
}) {
  const inicial = turmas.find((t) => t.id === turmaId);
  const tipos = useMemo(() => (["SEDE", "SETOR", "REGIONAL", "OUTRO"] as const).filter((t) => turmas.some((x) => x.tipo === t)), [turmas]);
  const [tipo, setTipo] = useState<string>(inicial?.tipo ?? (tipos.length === 1 ? tipos[0] : ""));
  const [grupo, setGrupo] = useState<string>(inicial?.grupo ?? "");
  const [turma, setTurma] = useState<string>(inicial?.id ?? "");

  const grupos = useMemo(
    () => [...new Set(turmas.filter((t) => t.tipo === tipo).map((t) => t.grupo))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [turmas, tipo]
  );
  // Sede tem um grupo só: já fica escolhido.
  const grupoEfetivo = grupo || (grupos.length === 1 ? grupos[0] : "");
  const opcoes = turmas.filter((t) => t.tipo === tipo && t.grupo === grupoEfetivo);

  if (simples) {
    return (
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-3 mb-4">
        <input type="hidden" name="aba" value={aba} />
        <label className="text-xs font-bold text-iw-navy flex-1 min-w-64">
          Minhas turmas
          <select name="turma" defaultValue={turmaId} className={input}>
            <option value="">Selecione…</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nucleo} — {t.titulo}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-iw-navy text-white text-sm font-bold px-4 py-2 rounded-lg">
          Abrir turma
        </button>
      </form>
    );
  }

  return (
    <form method="get" action={basePath} className="grid gap-3 sm:grid-cols-4 items-end mb-4">
      <input type="hidden" name="aba" value={aba} />
      <label className="text-xs font-bold text-iw-navy">
        Tipo
        <select value={tipo} onChange={(e) => { setTipo(e.target.value); setGrupo(""); setTurma(""); }} className={input}>
          <option value="">Selecione…</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{ROTULO[t]}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold text-iw-navy">
        {tipo === "REGIONAL" ? "Regional" : tipo === "SETOR" ? "Setor" : tipo === "SEDE" ? "Sede" : "Setor / Regional"}
        <select value={grupoEfetivo} onChange={(e) => { setGrupo(e.target.value); setTurma(""); }} disabled={!tipo} className={input}>
          <option value="">{tipo ? "Selecione…" : "Escolha o tipo primeiro"}</option>
          {grupos.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold text-iw-navy">
        Turma
        <select name="turma" value={turma} onChange={(e) => setTurma(e.target.value)} disabled={!grupoEfetivo} className={input}>
          <option value="">{grupoEfetivo ? "Selecione…" : "Escolha o setor primeiro"}</option>
          {opcoes.map((t) => (
            <option key={t.id} value={t.id}>{t.nucleo} — {t.titulo}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="bg-iw-navy text-white text-sm font-bold px-4 py-2 rounded-lg justify-self-start">
        Abrir turma
      </button>
    </form>
  );
}
