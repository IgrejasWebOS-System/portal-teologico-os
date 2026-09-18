"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Map, Church, Phone, FileText } from "lucide-react";
import { completarCadastroProfessorAction } from "./actions";
import { validarCPF } from "@/utils/cpf";
import type { UnitLite, CargoLite } from "../cadastro-professor/CadastroProfessorForm";

interface Props {
  units: UnitLite[];
  cargos: CargoLite[];
  atual: {
    telefone: string | null;
    cpf: string | null;
    cargo: string | null;
    unit_id: string | null;
  };
}

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

function maskPhone(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else v = v.length ? `(${v}` : v;
  return v;
}

export default function CompletarCadastroProfessorForm({ units, cargos, atual }: Props) {
  const unitAtual = units.find((u) => u.id === atual.unit_id) ?? null;

  const [setorId, setSetorId] = useState(unitAtual?.parent_id ?? "");
  const [igrejaId, setIgrejaId] = useState(atual.unit_id ?? "");
  const [telefone, setTelefone] = useState(atual.telefone ? maskPhone(atual.telefone) : "");
  const [cpf, setCpf] = useState(atual.cpf ? maskCPF(atual.cpf) : "");
  const [cargo, setCargo] = useState(atual.cargo ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const setores = useMemo(
    () => units.filter((u) => u.type === "SETOR").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );
  const igrejas = useMemo(
    () =>
      [
        ...(setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []),
        ...units.filter((u) => u.type === "SEDE"),
      ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units, setorId]
  );

  const igrejaEhSede = units.find((u) => u.id === igrejaId)?.type === "SEDE";

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!telefone.trim()) return setError("Informe seu telefone.");
    if (!cpf.trim() || !validarCPF(cpf)) return setError("Informe um CPF válido.");
    if (!cargo.trim()) return setError("Selecione seu cargo.");
    if (!igrejaId) return setError("Selecione a Igreja onde você dá aula.");
    if (!setorId && !igrejaEhSede) return setError("Selecione o Setor/Regional onde você dá aula.");

    fd.set("telefone", telefone);
    fd.set("cpf", cpf);
    fd.set("cargo", cargo);
    fd.set("unit_id", igrejaId);
    fd.set("setor_unit_id", setorId);

    startTransition(async () => {
      const res = await completarCadastroProfessorAction(fd);
      if (res && !res.success) {
        setError(res.message ?? "Erro ao salvar. Tente novamente.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone *</span></label>
          <input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} required />
        </div>

        <div>
          <label className={labelCls}>CPF *</label>
          <input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} required />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}><span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Cargo *</span></label>
          <select value={cargo} onChange={(e) => setCargo(e.target.value)} className={selectCls} required>
            <option value="">Selecione...</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-iw-border pt-4">
        <p className={labelCls}>Onde você dá aula</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor / Regional {!igrejaEhSede && "*"}</span></label>
            <select
              value={setorId}
              onChange={(e) => { setSetorId(e.target.value); setIgrejaId(""); }}
              disabled={igrejaEhSede}
              className={selectCls}
              required={!igrejaEhSede}
            >
              <option value="">{igrejaEhSede ? "Não se aplica à Sede" : "Selecione..."}</option>
              {setores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja *</span></label>
            <select
              value={igrejaId}
              onChange={(e) => setIgrejaId(e.target.value)}
              disabled={igrejas.length === 0}
              className={selectCls}
              required
            >
              <option value="">{igrejas.length > 0 ? "Selecione..." : "Escolha o setor primeiro"}</option>
              {igrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Concluir cadastro e entrar na Área do Professor
      </button>
    </form>
  );
}
