"use client";

// ============================================================
// Form "Nova Turma" com cascata Setor → Igreja (mesmo padrão do
// ProfessorForm.tsx / unitsChain.ts), pra toda turma nova já nascer
// vinculada a uma igreja (unit_id) — sem isso as 6.800 turmas do lote
// e qualquer turma nova ficariam sem filtro possível.
// ============================================================

import { useState } from "react";
import { Plus } from "lucide-react";
import type { UnitLite } from "./TurmasFiltros";

type Curso = { id: string; title: string };

interface Props {
  cursos: Curso[];
  units: UnitLite[];
  addTurmaConfigAction: (formData: FormData) => void | Promise<void>;
  ano: string;
  setorId: string;
  igrejaId: string;
}

const selectCls =
  "bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer";
const inputCls = "bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm";

export default function NovaTurmaForm({ cursos, units, addTurmaConfigAction, ano, setorId, igrejaId }: Props) {
  const [setorSel, setSetorSel] = useState(setorId);
  const [igrejaSel, setIgrejaSel] = useState(igrejaId);

  const setores = units.filter((u) => u.type === "SETOR").sort((a, b) => a.name.localeCompare(b.name));
  const sedes = units.filter((u) => u.type === "SEDE");
  // Sede não é Setor nem Regional — mas precisa aparecer como opção direta
  // no mesmo seletor (senão fica escondida, só implícita na lista de
  // Igreja) — mesmo padrão do seletor de Campo/Setor/Igreja no cadastro de
  // professor (achado em teste, 24/09/2026: "não está aparecendo a opção
  // de selecionar sede"). Selecionar uma Sede aqui já resolve o unit_id
  // direto, sem precisar escolher Igreja depois.
  const igrejas = setorSel
    ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorSel).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <details className="bg-iw-surface border border-iw-border rounded-2xl p-5 group">
      <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy uppercase tracking-wider">
        <Plus className="w-4 h-4 text-iw-gold" />
        Nova Turma
      </summary>
      <form action={addTurmaConfigAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
        {/* Preserva o filtro atual (ano/setor/igreja) na URL após o cadastro */}
        <input type="hidden" name="ano" value={ano} />
        <input type="hidden" name="setor_id" value={setorId} />
        <input type="hidden" name="igreja_id" value={igrejaId} />

        <select name="course_id" required defaultValue="" className={`${selectCls} sm:col-span-2`}>
          <option value="" disabled>Curso</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={setorSel}
          onChange={(e) => {
            const valor = e.target.value;
            setSetorSel(valor);
            const sedeSelecionada = sedes.find((s) => s.id === valor);
            setIgrejaSel(sedeSelecionada ? sedeSelecionada.id : "");
          }}
          className={`${selectCls} sm:col-span-2`}
        >
          <option value="">Setor / Regional...</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          name="unit_id"
          value={igrejaSel}
          onChange={(e) => setIgrejaSel(e.target.value)}
          disabled={!!sedes.find((s) => s.id === setorSel) || igrejas.length === 0}
          className={`${selectCls} sm:col-span-2`}
        >
          <option value="">
            {sedes.find((s) => s.id === setorSel) ? "Sede selecionada" : igrejas.length > 0 ? "Igreja..." : "Escolha o setor primeiro"}
          </option>
          {igrejas.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>

        <input
          name="nome"
          required
          placeholder='Nome da turma (ex: "2026 Turma 5")'
          className={`${inputCls} sm:col-span-2`}
        />
        <input
          name="classe"
          placeholder="Classe (opcional)"
          maxLength={40}
          className={`${inputCls} sm:col-span-1 uppercase`}
        />
        <input name="data_inicio" type="date" className={`${inputCls} sm:col-span-1`} />
        <input name="data_fim" type="date" className={`${inputCls} sm:col-span-1`} />

        <button
          type="submit"
          className="sm:col-span-1 justify-self-start bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
        >
          Cadastrar
        </button>
      </form>
    </details>
  );
}
