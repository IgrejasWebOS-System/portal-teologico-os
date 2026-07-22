"use client";

import { useState, useTransition } from "react";
import { Hash, Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { buscarMembroPorMatriculaAction, type MembroEncontrado } from "./actions";

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const labelCls =
  "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

interface Props {
  name?: string;
  label?: string;
  defaultValue?: string;
  onFound: (membro: MembroEncontrado) => void;
  onClear?: () => void;
}

/**
 * Campo de matrícula com busca real no cadastro de membros.
 * Ao encontrar, dispara onFound(membro) com nome/cargo/telefone/church_id
 * para o formulário-pai preencher os campos correspondentes.
 */
export default function MatriculaLookup({
  name = "matricula",
  label = "Matrícula",
  defaultValue = "",
  onFound,
  onClear,
}: Props) {
  const [valor, setValor] = useState(defaultValue);
  const [status, setStatus] = useState<"idle" | "found" | "not-found">("idle");
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();

  const buscar = () => {
    const mat = valor.trim();
    if (!mat) {
      setStatus("idle");
      setMensagem("");
      onClear?.();
      return;
    }
    startTransition(async () => {
      const res = await buscarMembroPorMatriculaAction(mat);
      if (res.success && res.data) {
        setStatus("found");
        setMensagem(`Encontrado: ${res.data.full_name}`);
        onFound(res.data);
      } else {
        setStatus("not-found");
        setMensagem(res.message ?? "Não encontrado.");
        onClear?.();
      }
    });
  };

  return (
    <div>
      <label className={labelCls}>
        <span className="inline-flex items-center gap-1">
          <Hash className="w-3 h-3" /> {label}
        </span>
      </label>
      <div className="flex gap-2">
        <input
          name={name}
          type="text"
          value={valor}
          placeholder="Ex: 12345"
          onChange={(e) => {
            setValor(e.target.value);
            setStatus("idle");
            setMensagem("");
          }}
          onBlur={buscar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          className={inputCls}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={isPending}
          className="shrink-0 w-10 h-[42px] flex items-center justify-center bg-iw-bg hover:bg-iw-border border border-iw-border rounded-xl text-iw-navy transition-colors disabled:opacity-50"
          title="Buscar membro"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
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
  );
}
