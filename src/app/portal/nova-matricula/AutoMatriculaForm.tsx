"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Send, Loader2 } from "lucide-react";
import { autoMatricularAction } from "./actions";
import { CURSOS_EAD } from "@/utils/cursos-ead";

type CampoMinisterio = { id: string; nome: string; tipo: string };

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

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30 transition-colors";
const labelCls = "block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5";

function SubmitButton({ pago }: { pago: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-iw-gold hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-opacity"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {pago ? "Abrindo pagamento..." : "Confirmando matrícula..."}
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          {pago ? "Ir para o pagamento" : "Confirmar matrícula"}
        </>
      )}
    </button>
  );
}

export default function AutoMatriculaForm({ campos }: { campos: CampoMinisterio[] }) {
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cursoSelecionado, setCursoSelecionado] = useState("");

  const precoSelecionado = CURSOS_EAD.find((c) => c.value === cursoSelecionado)?.precoMatriculaCentavos ?? 0;

  return (
    <form action={autoMatricularAction} className="flex flex-col gap-4">
      <div>
        <label className={labelCls} htmlFor="curso_pretendido">Curso</label>
        <select
          id="curso_pretendido"
          name="curso_pretendido"
          required
          className={inputCls}
          value={cursoSelecionado}
          onChange={(e) => setCursoSelecionado(e.target.value)}
        >
          <option value="" disabled>Selecione um curso</option>
          {CURSOS_EAD.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
              {c.precoMatriculaCentavos > 0
                ? ` — matrícula R$ ${(c.precoMatriculaCentavos / 100).toFixed(2).replace(".", ",")}`
                : " — gratuito"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="cpf">CPF</label>
          <input
            id="cpf"
            name="cpf"
            required
            value={cpf}
            onChange={(e) => setCpf(maskCPF(e.target.value))}
            className={inputCls}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="telefone">Telefone / WhatsApp</label>
          <input
            id="telefone"
            name="telefone"
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            className={inputCls}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="campo_ministerio_id">Campo / Ministério</label>
        <select id="campo_ministerio_id" name="campo_ministerio_id" className={inputCls} defaultValue="">
          <option value="">Selecione (opcional)</option>
          {campos.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <p className="text-[11px] text-iw-muted leading-relaxed">
        {precoSelecionado > 0
          ? "Este curso tem matrícula paga — você será levado ao pagamento e sua matrícula é confirmada assim que o pagamento for aprovado."
          : "Este curso é gratuito — sua matrícula é confirmada assim que você enviar."}
      </p>

      <SubmitButton pago={precoSelecionado > 0} />
    </form>
  );
}
