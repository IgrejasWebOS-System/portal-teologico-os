"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react";

export type TipoPessoa = "ALUNO" | "PROFESSOR" | "VISITANTE";

interface Props<T> {
  tipo: TipoPessoa;
  onChangeTipo: (t: TipoPessoa) => void;
  /** Chama a server action de busca (pública ou autenticada, conforme o formulário). */
  onBuscar: (identificador: string) => Promise<{ success: boolean; data?: T; message?: string }>;
  /** Disparado quando a busca encontra um cadastro — o formulário-pai decide o que preencher. */
  onEncontrado: (data: T) => void;
  onNaoTem?: () => void;
  className?: string;
}

/**
 * Passo inicial "Quem está se cadastrando?" — Aluno/Professor(a)/Visitante +
 * "já tem cadastro?" (Sim/Não) com busca por Matrícula ou CPF. Ao encontrar,
 * o formulário-pai usa os dados retornados pra pré-preencher os campos,
 * evitando redigitar quem já está no sistema.
 */
export default function JaTemCadastroCard<T>({
  tipo,
  onChangeTipo,
  onBuscar,
  onEncontrado,
  onNaoTem,
  className,
}: Props<T>) {
  const [jaTem, setJaTem] = useState<"" | "SIM" | "NAO">("");
  const [identificador, setIdentificador] = useState("");
  const [status, setStatus] = useState<"idle" | "found" | "not-found">("idle");
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const buscar = () => {
    const termo = identificador.trim();
    if (!termo) {
      setStatus("idle");
      setMensagem("");
      return;
    }
    startTransition(async () => {
      const res = await onBuscar(termo);
      if (res.success && res.data) {
        setStatus("found");
        setMensagem(res.message ?? "Cadastro encontrado — dados preenchidos automaticamente.");
        onEncontrado(res.data);
      } else {
        setStatus("not-found");
        setMensagem(res.message ?? "Nenhum cadastro encontrado com essa matrícula/CPF.");
      }
    });
  };

  return (
    <div className={`bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
        <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserCheck className="w-3.5 h-3.5 text-iw-gold" />
        </div>
        <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">Quem está se cadastrando?</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["ALUNO", "PROFESSOR", "VISITANTE"] as TipoPessoa[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChangeTipo(t)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-colors ${
              tipo === t
                ? "bg-iw-gold/10 border-iw-gold text-iw-navy"
                : "bg-white border-iw-border text-iw-muted hover:border-iw-gold/50"
            }`}
          >
            {t === "ALUNO" ? "Aluno" : t === "PROFESSOR" ? "Professor(a)" : "Visitante"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-iw-navy">Já tem cadastro no sistema?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setJaTem("SIM")}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              jaTem === "SIM"
                ? "bg-iw-blue text-white border-iw-blue"
                : "bg-white border-iw-border text-iw-muted hover:border-iw-blue/50"
            }`}
          >
            Sim, já tenho
          </button>
          <button
            type="button"
            onClick={() => {
              setJaTem("NAO");
              setStatus("idle");
              setMensagem("");
              onNaoTem?.();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              jaTem === "NAO"
                ? "bg-iw-blue text-white border-iw-blue"
                : "bg-white border-iw-border text-iw-muted hover:border-iw-blue/50"
            }`}
          >
            Não, sou novo(a)
          </button>
        </div>
      </div>

      {jaTem === "SIM" && (
        <div>
          <label className="block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">
            Matrícula ou CPF
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={identificador}
              onChange={(e) => {
                setIdentificador(e.target.value);
                setStatus("idle");
                setMensagem("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscar();
                }
              }}
              placeholder="Ex: 12345 ou 000.000.000-00"
              className="flex-1 bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/30 transition-colors"
            />
            <button
              type="button"
              onClick={buscar}
              disabled={isPending}
              className="shrink-0 w-11 flex items-center justify-center bg-iw-bg hover:bg-iw-border border border-iw-border rounded-xl text-iw-navy transition-colors disabled:opacity-50"
              title="Buscar cadastro"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {status === "found" && (
            <p className="mt-1.5 text-[11px] font-semibold text-iw-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> {mensagem}
            </p>
          )}
          {status === "not-found" && (
            <p className="mt-1.5 text-[11px] font-semibold text-iw-error flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {mensagem}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
