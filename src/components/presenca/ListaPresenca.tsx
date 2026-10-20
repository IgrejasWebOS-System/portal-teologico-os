"use client";

import { useMemo, useState } from "react";

// Lista de presença de uma aula (20/10/2026): uma caixa por aluno, "Marcar todos presentes"
// e "Desmarcar todos". Quem fica desmarcado vira falta ao salvar. Aluno de outra turma do
// mesmo curso entra pelo seletor "Adicionar aluno de outra turma" (presença vale por aluno e aula).
// Só controla o estado visual: o envio é o formulário da página (campos "presente"/"justificada").

export interface AlunoLista {
  id: string; // matrícula
  nome: string;
  situacao: string | null; // PRESENTE | FALTA | JUSTIFICADA | null (ainda sem registro)
  jaAssistiu?: string | null; // dd/mm, se já assistiu esta aula em outra data/turma
  turma?: string | null; // só para aluno de outra turma
}

export default function ListaPresenca({
  alunos,
  candidatos,
  disabled,
  justifica,
}: {
  alunos: AlunoLista[];
  candidatos: AlunoLista[];
  disabled: boolean;
  justifica: boolean;
}) {
  const [itens, setItens] = useState<AlunoLista[]>(alunos);
  const [presente, setPresente] = useState<Record<string, boolean>>(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.situacao === "PRESENTE"]))
  );
  const [justificada, setJustificada] = useState<Record<string, boolean>>(
    () => Object.fromEntries(alunos.map((a) => [a.id, a.situacao === "JUSTIFICADA"]))
  );

  const disponiveis = useMemo(() => candidatos.filter((c) => !itens.some((i) => i.id === c.id)), [candidatos, itens]);
  const nPresentes = itens.filter((i) => presente[i.id]).length;
  const nJustificadas = itens.filter((i) => !presente[i.id] && justificada[i.id]).length;
  const nFaltas = itens.length - nPresentes - nJustificadas;

  function marcarTodos(valor: boolean) {
    setPresente(Object.fromEntries(itens.map((i) => [i.id, valor])));
    if (valor) setJustificada(Object.fromEntries(itens.map((i) => [i.id, false])));
  }

  function adicionar(id: string) {
    const c = candidatos.find((x) => x.id === id);
    if (!c) return;
    setItens((l) => [...l, c]);
    setPresente((p) => ({ ...p, [id]: true }));
  }

  const btn = "border border-iw-navy text-iw-navy text-sm font-bold px-3 py-1.5 rounded-lg disabled:opacity-50";

  return (
    <div>
      <p className="text-xs text-iw-navy/60 mb-2">
        {nPresentes} presente(s), {nFaltas} falta(s){nJustificadas > 0 ? `, ${nJustificadas} justificada(s)` : ""}
      </p>
      {!disabled && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" onClick={() => marcarTodos(true)} className={btn}>Marcar todos presentes</button>
          <button type="button" onClick={() => marcarTodos(false)} className={btn}>Desmarcar todos</button>
        </div>
      )}
      <ul className="divide-y divide-iw-border mb-4 border-t border-iw-border">
        {itens.map((a) => {
          const p = !!presente[a.id];
          const j = !p && !!justificada[a.id];
          return (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <label className="flex items-center gap-3 text-sm text-iw-navy cursor-pointer">
                <input
                  type="checkbox"
                  name="presente"
                  value={a.id}
                  checked={p}
                  disabled={disabled}
                  onChange={(e) => setPresente((s) => ({ ...s, [a.id]: e.target.checked }))}
                  className="w-5 h-5"
                />
                <span>
                  {a.nome}
                  {a.turma && <span className="ml-2 text-xs text-iw-navy/60">(outra turma: {a.turma})</span>}
                  {a.jaAssistiu && !p && <span className="ml-2 text-xs text-iw-navy/60">(já assistiu em {a.jaAssistiu})</span>}
                </span>
              </label>
              <span className="flex items-center gap-3 text-xs">
                {justifica && !p && (
                  <label className="flex items-center gap-1 cursor-pointer text-iw-navy/60">
                    <input
                      type="checkbox"
                      name="justificada"
                      value={a.id}
                      checked={!!justificada[a.id]}
                      disabled={disabled}
                      onChange={(e) => setJustificada((s) => ({ ...s, [a.id]: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    justificada
                  </label>
                )}
                <span className={p ? "text-iw-success font-bold" : j ? "text-amber-700 font-bold" : "text-iw-error font-bold"}>
                  {p ? "Presente" : j ? "Falta justificada" : "Falta"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {!disabled && disponiveis.length > 0 && (
        <label className="block text-xs font-bold text-iw-navy mb-4">
          Adicionar aluno de outra turma (mesmo curso)
          <select
            value=""
            onChange={(e) => adicionar(e.target.value)}
            className="mt-1 w-full border border-iw-border rounded-lg px-3 py-2 text-sm font-normal bg-white"
          >
            <option value="">Selecione…</option>
            {disponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.turma}
                {c.jaAssistiu ? ` (já assistiu em ${c.jaAssistiu})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
