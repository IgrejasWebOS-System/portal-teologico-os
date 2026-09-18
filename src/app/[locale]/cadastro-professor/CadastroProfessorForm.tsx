"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Map, Church, User, Phone, FileText } from "lucide-react";
import { cadastrarProfessorPublicoAction } from "./actions";

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };

interface Props {
  units: UnitLite[];
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

export default function CadastroProfessorForm({ units }: Props) {
  const [setorId, setSetorId] = useState("");
  const [igrejaId, setIgrejaId] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState<{ matricula: string; avisoConvite: string | null } | null>(null);
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

  const handleSubmit = (fd: FormData) => {
    setError("");
    if (!nome.trim()) return setError("Digite seu nome completo.");
    if (!email.trim() || !email.includes("@")) return setError("Informe um e-mail válido — é por ele que você vai acessar o sistema.");
    if (!igrejaId) return setError("Selecione o Setor e a Igreja onde você dá aula.");

    fd.set("nome_completo", nome.trim());
    fd.set("email", email.trim());
    fd.set("telefone", telefone);
    fd.set("cpf", cpf);
    fd.set("cargo", cargo);
    fd.set("unit_id", igrejaId);
    fd.set("setor_unit_id", setorId);

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
            <p className="text-sm text-iw-muted mt-1">Seu código de professor: <span className="font-bold text-iw-navy">{sucesso.matricula}</span></p>
          )}
        </div>
        {sucesso.avisoConvite ? (
          <p className="text-sm text-iw-warning bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-md mx-auto">
            {sucesso.avisoConvite}
          </p>
        ) : (
          <p className="text-sm text-iw-muted max-w-md mx-auto">
            Confira seu e-mail (inclusive a caixa de spam) — enviamos um link pra você criar sua
            senha. Depois de entrar, acesse a Área do Professor pra cadastrar suas turmas.
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
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail *</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</span></label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>CPF (se for membro, ajuda a te reconhecer)</label>
          <input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Cargo (opcional)</span></label>
          <input
            value={cargo}
            onChange={(e) => setCargo(e.target.value.toUpperCase())}
            placeholder="Ex: Professor(a)"
            className={`${inputCls} uppercase`}
          />
        </div>
      </div>

      <div className="border-t border-iw-border pt-4">
        <p className={labelCls}>Onde você dá aula</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor / Regional</span></label>
            <select
              value={setorId}
              onChange={(e) => { setSetorId(e.target.value); setIgrejaId(""); }}
              className={selectCls}
            >
              <option value="">Selecione...</option>
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
        className="w-full flex items-center justify-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Concluir cadastro
      </button>
    </form>
  );
}
