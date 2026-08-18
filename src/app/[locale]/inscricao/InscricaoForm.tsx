"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Send, Loader2 } from "lucide-react";
import { submitInscricaoAction } from "./actions";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("inscricao.form");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-opacity border border-black"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("enviando")}
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          {t("enviar")}
        </>
      )}
    </button>
  );
}

export default function InscricaoForm({
  campos,
  locale,
}: {
  campos: CampoMinisterio[];
  locale: string;
}) {
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const t = useTranslations("inscricao.form");

  return (
    <form action={submitInscricaoAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className={labelCls} htmlFor="nome_completo">{t("nomeCompleto")}</label>
        <input id="nome_completo" name="nome_completo" required className={inputCls} placeholder={t("placeholderNomeCompleto")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="cpf">{t("cpf")}</label>
          <input
            id="cpf"
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCPF(e.target.value))}
            className={inputCls}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="telefone">{t("telefone")}</label>
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
        <label className={labelCls} htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required className={inputCls} placeholder={t("placeholderEmail")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="campo_ministerio_id">{t("campoMinisterio")}</label>
          <select id="campo_ministerio_id" name="campo_ministerio_id" className={inputCls} defaultValue="">
            <option value="">{t("selecioneOpcional")}</option>
            {campos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="curso_pretendido">{t("cursoPretendido")}</label>
          <select id="curso_pretendido" name="curso_pretendido" required className={inputCls} defaultValue="">
            <option value="" disabled>{t("selecioneCurso")}</option>
            {CURSOS_EAD.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
                {c.precoMatriculaCentavos > 0
                  ? ` — ${t("matricula")} R$ ${(c.precoMatriculaCentavos / 100).toFixed(2).replace(".", ",")}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="mensagem">{t("mensagem")}</label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={3}
          className={inputCls}
          placeholder={t("placeholderMensagem")}
        />
      </div>

      <p className="text-[11px] text-iw-muted leading-relaxed">
        {t("avisoLgpd")}
      </p>

      <SubmitButton />
    </form>
  );
}
