"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Phone, User, Hash } from "lucide-react";
import { matricularPorLinkAction } from "./actions";
import { validarCPF } from "@/utils/cpf";
import { validarEmail } from "@/utils/email";

interface Props {
  token: string;
  cursoTitulo: string;
}

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
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

export default function MatriculaTurmaForm({ token, cursoTitulo }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [matriculaMembro, setMatriculaMembro] = useState("");
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState<{ matricula: string; avisoConvite: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!nome.trim()) return setError("Digite seu nome completo.");
    if (!email.trim() || !validarEmail(email)) return setError("Informe um e-mail válido, com domínio completo (ex.: nome@provedor.com) — é por ele que você vai acessar o portal.");
    if (!cpf.trim() || !validarCPF(cpf)) return setError("Informe um CPF válido.");

    fd.set("token", token);
    fd.set("nome_completo", nome.trim());
    fd.set("email", email.trim());
    fd.set("telefone", telefone);
    fd.set("cpf", cpf);
    fd.set("matricula_membro_informada", matriculaMembro);

    startTransition(async () => {
      const res = await matricularPorLinkAction(fd);
      if (!res.success) {
        setError(res.message ?? "Erro ao enviar sua matrícula. Tente novamente.");
        return;
      }
      setSucesso({ matricula: res.matricula ?? "", avisoConvite: res.avisoConvite ?? null });
    });
  };

  if (sucesso) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="w-12 h-12 text-iw-success mx-auto" />
        <div>
          <p className="font-bold text-iw-navy text-lg">Matrícula concluída!</p>
          {sucesso.matricula && (
            <p className="text-sm text-iw-muted mt-1">Sua matrícula: <span className="font-bold text-iw-navy">{sucesso.matricula}</span></p>
          )}
        </div>
        {sucesso.avisoConvite ? (
          <p className="text-sm text-iw-warning bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-md mx-auto">
            {sucesso.avisoConvite}
          </p>
        ) : (
          <p className="text-sm text-iw-muted max-w-md mx-auto">
            Confira seu e-mail (inclusive a caixa de spam) — enviamos um link pra você definir sua
            senha e acessar {cursoTitulo} no portal.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className={labelCls}><span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Nome completo *</span></label>
        <input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} placeholder="Seu nome completo" className={`${inputCls} uppercase`} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>CPF *</label>
          <input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</span></label>
          <input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}><span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail *</span></label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} required />
        <p className="text-[11px] text-iw-muted mt-1">É por ele que você vai entrar no portal — enviaremos um link pra criar sua senha.</p>
      </div>

      <div>
        <label className={labelCls}><span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /> Sua matrícula de membro, se lembrar (opcional)</span></label>
        <input
          value={matriculaMembro}
          onChange={(e) => setMatriculaMembro(e.target.value)}
          placeholder="Não lembra? Pode deixar em branco — seu cadastro continua normalmente"
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Concluir matrícula
      </button>
    </form>
  );
}
