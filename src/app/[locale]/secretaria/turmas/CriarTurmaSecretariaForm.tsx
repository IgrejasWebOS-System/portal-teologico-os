"use client";

// ============================================================
// CriarTurmaSecretariaForm — 04/10/2026, Etapa 7. Espelha o bloco
// "Criar turma nova" de /professor/TurmasDoProfessor.tsx, adaptado:
// aqui o secretário escolhe TAMBÉM qual professor (dentro do seu
// escopo) vai ficar dono da turma — o professor sempre cria pra si
// mesmo, então lá esse campo não existe. Núcleo vem de
// getNucleosDoEscopo (já filtrado pelo escopo do secretário) em vez da
// cascata Campo/Setor/Igreja completa do admin.
// ============================================================

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, PlusCircle } from "lucide-react";
import { secretariaCriarTurmaAction } from "../actions";
import PeriodoTurmaFields from "@/components/turmas/PeriodoTurmaFields";

type Professor = { id: string; nomeCompleto: string; churchId: string | null };
type Curso = { id: string; title: string };
type Nucleo = { churchId: string; unitId: string; nome: string };

const selectCls = "bg-white border-[1.2px] border-black rounded-xl px-3.5 py-2.5 text-sm text-black cursor-pointer";
const inputCls = "bg-white border-[1.2px] border-black rounded-xl px-3.5 py-2.5 text-sm text-black";

const TURNOS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
];
const DIAS = [
  { value: "DOMINGO", label: "Domingo" },
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
];

function BotaoCriarTurma({ podeEnviar }: { podeEnviar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!podeEnviar || pending}
      className="flex items-center justify-center gap-2 bg-black hover:opacity-90 disabled:opacity-50 text-white border-2 border-iw-gold px-5 py-2.5 rounded-xl text-sm font-bold uppercase transition-opacity"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {pending ? "Criando turma..." : "Criar turma e gerar link"}
    </button>
  );
}

export default function CriarTurmaSecretariaForm({
  professores,
  cursos,
  nucleos,
}: {
  professores: Professor[];
  cursos: Curso[];
  nucleos: Nucleo[];
}) {
  const [nucleoId, setNucleoId] = useState("");
  const [professorId, setProfessorId] = useState("");

  const nucleoSelecionado = nucleos.find((n) => n.churchId === nucleoId);
  const professoresDoNucleo = useMemo(
    () => professores.filter((p) => !nucleoId || p.churchId === nucleoId),
    [professores, nucleoId]
  );

  return (
    <details className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5" open>
      <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-black">
        <PlusCircle className="w-4 h-4 text-iw-gold" /> Criar turma nova
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-xs text-black">
          Cria a turma e já gera o link de matrícula — escolha o núcleo e o professor responsável.
        </p>

        <form action={secretariaCriarTurmaAction} className="space-y-3">
          <input type="hidden" name="unit_id" value={nucleoSelecionado?.unitId ?? ""} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={nucleoId}
              onChange={(e) => {
                setNucleoId(e.target.value);
                setProfessorId("");
              }}
              className={selectCls}
            >
              <option value="">Núcleo...</option>
              {nucleos.map((n) => (
                <option key={n.churchId} value={n.churchId}>
                  {n.nome}
                </option>
              ))}
            </select>

            <select
              name="professor_id"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              disabled={!nucleoId}
              className={selectCls}
            >
              <option value="">{nucleoId ? "Professor responsável..." : "Escolha o núcleo primeiro"}</option>
              {professoresDoNucleo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </option>
              ))}
            </select>

            <select name="course_id" required defaultValue="" className={selectCls}>
              <option value="" disabled>
                Curso...
              </option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" name="nome" required placeholder="Nome da turma (ex.: 2026 Turma 1)" className={`${inputCls} lg:col-span-2`} />
            <input type="text" name="classe" placeholder="Classe (opcional)" className={inputCls} />
            <select name="turno" required defaultValue="" className={selectCls}>
              <option value="" disabled>
                Turno...
              </option>
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <select name="dia_semana" required defaultValue="" className={selectCls}>
              <option value="" disabled>
                Dia da semana...
              </option>
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <PeriodoTurmaFields inputClassName={inputCls} selectClassName={selectCls} />
          </div>

          <BotaoCriarTurma podeEnviar={!!nucleoId && !!professorId} />
          {(!nucleoId || !professorId) && (
            <p className="text-[11px] text-black">Escolha o núcleo e o professor responsável pra liberar o botão.</p>
          )}
        </form>
      </div>
    </details>
  );
}
