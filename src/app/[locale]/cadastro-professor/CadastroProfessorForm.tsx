"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, User, Phone } from "lucide-react";
import { cadastrarProfessorPublicoAction } from "./actions";
import { validarCPF } from "@/utils/cpf";
import { validarEmail } from "@/utils/email";
import { maskPhone } from "@/utils/maskPhone";

// ============================================================
// Autocadastro público de professor (mutirão) — reduzido a 4 campos
// (pedido do Joaquim, 20/09/2026): Nome completo, CPF, E-mail, Telefone.
// Cargo e Campo/Setor/Igreja saíram daqui e passaram a ser preenchidos na
// ficha completa de /completar-cadastro, no primeiro login (mesma tela
// que a secretaria usa em "Novo Professor").
// ============================================================

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };
export type CargoLite = { id: string; name: string };

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


export default function CadastroProfessorForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState<{ matricula: string; avisoConvite: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!nome.trim()) return setError("Digite seu nome completo.");
    if (!email.trim() || !validarEmail(email)) return setError("Informe um e-mail válido, com domínio completo (ex.: nome@provedor.com) — é por ele que você vai acessar o sistema.");
    if (!telefone.trim()) return setError("Informe seu telefone.");
    if (!cpf.trim() || !validarCPF(cpf)) return setError("Informe um CPF válido.");

    fd.set("nome_completo", nome.trim());
    fd.set("email", email.trim());
    fd.set("telefone", telefone);
    fd.set("cpf", cpf);

    startTransition(async () => {
      const res = await cadastrarProfessorPublicoAction(fd);
      if (!res.success) {
        setError(res.message ?? "Erro ao enviar o cadastro. Tente novamente.");
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
          <p className="font-bold text-iw-navy text-lg">Cadastro enviado com sucesso!</p>
          {sucesso.matricula && (
            <p className="text-sm text-[#0D0D0D] mt-1">Seu código de professor: <span className="font-bold text-iw-navy">{sucesso.matricula}</span></p>
          )}
        </div>
        {sucesso.avisoConvite ? (
          // 26/09/2026, pedido do Joaquim: texto preto (era âmbar, baixo
          // contraste) e fonte +2pt (mesma convenção usada no aviso de
          // "confira seu e-mail" — text-sm → text-base).
          <p className="text-base text-black bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-md mx-auto">
            {sucesso.avisoConvite}
          </p>
        ) : (
          <p className="text-base text-[#0D0D0D] max-w-md mx-auto">
            Confira seu e-mail (
            <span className="bg-blue-100 text-red-600 font-semibold px-1 rounded">inclusive a caixa de spam</span>
            ) — enviamos um link pra você criar sua senha. Depois de entrar, você completa sua
            ficha e, se já tiver turma, se vincula a ela.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}><span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Nome completo *</span></label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.toUpperCase())}
            placeholder="Seu nome completo"
            className={`${inputCls} uppercase`}
            required
          />
        </div>

        <div>
          <label className={labelCls}>CPF *</label>
          <input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} required />
        </div>

        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone *</span></label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className={inputCls}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail *</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputCls}
            required
          />
          <p className="text-[11px] text-iw-muted mt-1">É por ele que você vai entrar no sistema — enviaremos um link pra criar sua senha.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Concluir cadastro
      </button>
    </form>
  );
}
