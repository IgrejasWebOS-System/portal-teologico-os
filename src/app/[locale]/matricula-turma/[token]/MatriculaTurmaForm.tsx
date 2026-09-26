"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Phone, User, Hash, CalendarDays } from "lucide-react";
import { matricularPorLinkAction } from "./actions";
import { validarCPF } from "@/utils/cpf";
import { validarEmail } from "@/utils/email";
import { maskPhone } from "@/utils/maskPhone";

interface Props {
  token: string;
  cursoTitulo: string;
}

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-black placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const labelCls = "block text-[11px] font-bold text-black uppercase tracking-wider mb-1.5";

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}


export default function MatriculaTurmaForm({ token, cursoTitulo }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [matriculaMembro, setMatriculaMembro] = useState("");
  // 25/09/2026, pedido do Joaquim: perguntar aqui a data em que a pessoa já
  // começou a cursar (mutirão é pra quem já estuda desde janeiro/2026, não
  // só matrícula nova) — essa data vira ead_matriculas.data_matricula e é
  // reaproveitada como âncora do cálculo de parcelas em
  // /completar-cadastro/pagamento (ver page.tsx de lá), no lugar de "hoje".
  // Opcional: em branco, mantém o comportamento de sempre (data de hoje).
  const [dataMatricula, setDataMatricula] = useState("");
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState<{ matricula: string; avisoConvite: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!nome.trim()) return setError("Digite seu nome completo.");
    if (!email.trim() || !validarEmail(email)) return setError("Informe um e-mail válido, com domínio completo (ex.: nome@provedor.com) — é por ele que você vai acessar o portal.");
    if (!cpf.trim() || !validarCPF(cpf)) return setError("Informe um CPF válido.");
    if (dataMatricula && dataMatricula > new Date().toISOString().slice(0, 10)) {
      return setError("A data que você começou a cursar não pode ser no futuro.");
    }

    fd.set("token", token);
    fd.set("nome_completo", nome.trim());
    fd.set("email", email.trim());
    fd.set("telefone", telefone);
    fd.set("cpf", cpf);
    fd.set("matricula_membro_informada", matriculaMembro);
    fd.set("data_matricula_informada", dataMatricula);

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
          <p className="font-bold text-black text-lg">Matrícula concluída!</p>
          {sucesso.matricula && (
            <p className="text-sm text-black mt-1">Sua matrícula: <span className="font-bold text-black">{sucesso.matricula}</span></p>
          )}
        </div>
        {sucesso.avisoConvite ? (
          <p className="text-sm font-bold uppercase bg-[#0D0D0D] text-[#CF8403] border-[1.5px] border-[#CF8403] rounded-xl px-4 py-3 max-w-md mx-auto">
            {sucesso.avisoConvite}
          </p>
        ) : (
          <p className="text-base text-[#0D0D0D] max-w-md mx-auto">
            Confira seu e-mail (
            <span className="bg-blue-100 text-red-600 font-semibold px-1 rounded">inclusive a caixa de spam</span>
            ) — enviamos um link pra você definir sua senha e acessar {cursoTitulo} no portal.
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
        <p className="text-[11px] text-black mt-1">É por ele que você vai entrar no portal — enviaremos um link pra criar sua senha.</p>
      </div>

      <div>
        <label className={labelCls}><span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Desde quando você já cursa? (opcional)</span></label>
        <input
          type="date"
          value={dataMatricula}
          onChange={(e) => setDataMatricula(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className={inputCls}
        />
        <p className="text-[11px] text-black mt-1">
          Se você já vem estudando desde antes (ex.: turma que começou em janeiro), informe a data —
          isso ajusta suas mensalidades pra começarem do mês certo, não de hoje. Se está começando
          agora, pode deixar em branco.
        </p>
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
