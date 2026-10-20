"use client";

import { useMemo, useState } from "react";
import type { TurmaPresenca } from "@/utils/presenca-contexto";

// Passo 1-3 da presença por aula (20/10/2026): Aula -> Data -> Turma.
// A turma lista só as turmas do curso da aula escolhida. Envio é GET (?aula&data&turma).

export interface AulaOpcao {
  id: string;
  titulo: string;
  cursoId: string;
  curso: string;
}

const input = "mt-1 w-full border border-iw-border rounded-lg px-3 py-2 text-sm font-normal bg-white";

export default function SeletorAula({
  aulas,
  turmas,
  basePath,
  aulaId,
  turmaId,
  data,
  hoje,
  dataMin,
}: {
  aulas: AulaOpcao[];
  turmas: TurmaPresenca[];
  basePath: string;
  aulaId: string;
  turmaId: string;
  data: string;
  hoje: string;
  dataMin: string;
}) {
  const [aula, setAula] = useState(aulaId);
  const [turma, setTurma] = useState(turmaId);
  const cursoDaAula = aulas.find((a) => a.id === aula)?.cursoId ?? "";
  const opcoes = useMemo(() => turmas.filter((t) => t.cursoId === cursoDaAula), [turmas, cursoDaAula]);
  const cursos = useMemo(() => {
    const m = new Map<string, { curso: string; aulas: AulaOpcao[] }>();
    for (const a of aulas) {
      const g = m.get(a.cursoId) ?? { curso: a.curso, aulas: [] };
      g.aulas.push(a);
      m.set(a.cursoId, g);
    }
    return [...m.values()];
  }, [aulas]);

  return (
    <form method="get" action={basePath} className="bg-white border border-iw-border rounded-xl p-4 mb-4">
      <input type="hidden" name="aba" value="chamada" />
      <p className="text-sm font-bold text-iw-navy mb-3">Registrar presença de uma aula</p>
      <div className="grid gap-3 sm:grid-cols-3 items-end">
        <label className="text-xs font-bold text-iw-navy">
          1. Qual aula você está aplicando?
          <select
            name="aula"
            value={aula}
            onChange={(e) => { setAula(e.target.value); setTurma(""); }}
            required
            className={input}
          >
            <option value="">Selecione…</option>
            {cursos.map((g) => (
              <optgroup key={g.curso} label={g.curso}>
                {g.aulas.map((a) => (
                  <option key={a.id} value={a.id}>{a.titulo}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-iw-navy">
          2. Em que dia foi a aula?
          <input type="date" name="data" defaultValue={data} min={dataMin} max={hoje} required className={input} />
        </label>
        <label className="text-xs font-bold text-iw-navy">
          3. Para qual turma?
          <select
            name="turma"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            disabled={!aula}
            required
            className={input}
          >
            <option value="">{aula ? "Selecione…" : "Escolha a aula primeiro"}</option>
            {opcoes.map((t) => (
              <option key={t.id} value={t.id}>{t.nucleo} — {t.titulo}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="mt-3 bg-iw-navy text-white text-sm font-bold px-4 py-2 rounded-lg">
        Abrir lista de presença
      </button>
    </form>
  );
}
