"use client";

// ============================================================
// Busca única por matrícula, CPF ou nome — usada no cadastro
// unificado de Professor (15/09/2026). Decide sozinha qual busca fazer
// pelo formato digitado: só dígitos (com ou sem máscara) tenta
// matrícula/CPF direto (buscarCadastroCompletoAction, 1 resultado); tem
// letra, busca por nome (buscarMembroPorNomeAction, pode ter vários —
// mostra lista pra escolher, e busca a ficha completa do escolhido).
// Sempre entrega a FICHA COMPLETA (MembroCompletoEncontrado) pro
// formulário preencher todos os campos de uma vez.
// ============================================================

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  buscarCadastroCompletoAction,
  buscarMembroPorNomeAction,
  buscarMembroCompletoPorIdAction,
  type MembroEncontrado,
  type MembroCompletoEncontrado,
} from "../actions";

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

interface Props {
  onEncontrado: (membro: MembroCompletoEncontrado) => void;
  onLimpar?: () => void;
}

export default function BuscaProfessorCompleta({ onEncontrado, onLimpar }: Props) {
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<"idle" | "found" | "not-found" | "choosing">("idle");
  const [mensagem, setMensagem] = useState("");
  const [opcoes, setOpcoes] = useState<MembroEncontrado[]>([]);
  const [isPending, startTransition] = useTransition();

  const buscar = () => {
    const termo = valor.trim();
    if (!termo) {
      setStatus("idle");
      setMensagem("");
      setOpcoes([]);
      onLimpar?.();
      return;
    }

    const soDigitosEMascara = termo.replace(/[.\-\s/]/g, "");
    const pareceCodigoOuCpf = /^\d+$/.test(soDigitosEMascara);

    startTransition(async () => {
      if (pareceCodigoOuCpf) {
        const res = await buscarCadastroCompletoAction(termo);
        if (res.success && res.data) {
          setStatus("found");
          setOpcoes([]);
          setMensagem(`Encontrado: ${res.data.full_name}`);
          onEncontrado(res.data);
        } else {
          setStatus("not-found");
          setMensagem(res.message ?? "Não encontrado.");
          onLimpar?.();
        }
        return;
      }

      const res = await buscarMembroPorNomeAction(termo);
      if (!res.success || !res.data) {
        setStatus("not-found");
        setMensagem(res.message ?? "Não encontrado.");
        onLimpar?.();
        return;
      }
      if (res.data.length === 1) {
        const completo = await buscarMembroCompletoPorIdAction(res.data[0].id);
        if (completo.success && completo.data) {
          setStatus("found");
          setOpcoes([]);
          setMensagem(`Encontrado: ${completo.data.full_name}`);
          onEncontrado(completo.data);
          return;
        }
      }
      setStatus("choosing");
      setOpcoes(res.data);
      setMensagem(`${res.data.length} encontrado(s) — escolha um:`);
    });
  };

  const escolher = (membro: MembroEncontrado) => {
    startTransition(async () => {
      const completo = await buscarMembroCompletoPorIdAction(membro.id);
      if (completo.success && completo.data) {
        setStatus("found");
        setOpcoes([]);
        setMensagem(`Encontrado: ${completo.data.full_name}`);
        onEncontrado(completo.data);
      }
    });
  };

  return (
    <div>
      <label className={labelCls}>
        <span className="inline-flex items-center gap-1">
          <Search className="w-3 h-3" /> Buscar (matrícula, CPF ou nome)
        </span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={valor}
          placeholder="Ex: 12345, CPF ou nome completo"
          onChange={(e) => {
            setValor(e.target.value);
            setStatus("idle");
            setMensagem("");
            setOpcoes([]);
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
          title="Buscar"
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
          <AlertTriangle className="w-3 h-3 shrink-0" /> {mensagem} — pode preencher a ficha abaixo manualmente.
        </p>
      )}
      {status === "choosing" && (
        <div className="mt-1.5 bg-iw-bg border border-iw-border rounded-xl p-2 space-y-1">
          <p className="text-[11px] font-semibold text-iw-muted px-1">{mensagem}</p>
          {opcoes.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => escolher(o)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-iw-navy hover:bg-white transition-colors"
            >
              <span className="font-semibold">{o.full_name}</span>
              {o.registration_number && <span className="text-iw-muted"> — matrícula {o.registration_number}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
