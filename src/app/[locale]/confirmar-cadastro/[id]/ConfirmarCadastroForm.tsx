"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { confirmarCadastroAction } from "./actions";

interface Aluno {
  id: string;
  nome_completo: string;
  cpf: string | null;
  matricula: string;
  curso_pretendido: string | null;
  telefone: string | null;
}

const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className={boxCls}>
      <label className={boxLabelCls}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

function maskPhone(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else v = v.length ? `(${v}` : v;
  return v;
}

export default function ConfirmarCadastroForm({ aluno }: { aluno: Aluno }) {
  const [telefone, setTelefone] = useState(aluno.telefone ?? "");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleBlurCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro ?? endereco);
        setBairro(data.bairro ?? bairro);
        setCidade(data.localidade ?? cidade);
        setEstado(data.uf ?? estado);
      }
    } catch {
      // silencioso — os campos continuam editáveis manualmente
    } finally {
      setLoadingCep(false);
    }
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (fd: FormData) => {
    fd.set("telefone", telefone);
    fd.set("cep", cep);
    fd.set("endereco", endereco);
    fd.set("bairro", bairro);
    fd.set("cidade", cidade);
    fd.set("estado", estado);
    if (fotoFile) fd.set("foto", fotoFile);
    startTransition(async () => {
      const res = await confirmarCadastroAction(aluno.id, fd);
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      setErro("");
      setConcluido(true);
    });
  };

  if (concluido) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-3">
          <CheckCircle2 className="w-12 h-12 text-iw-gold mx-auto" />
          <p className="text-iw-navy font-bold text-lg">Cadastro confirmado!</p>
          <p className="text-sm text-iw-muted">
            Matrícula {aluno.matricula} concluída. Enviamos um e-mail de acesso ao portal — confira sua
            caixa de entrada (e spam) pra criar sua senha.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      <div className="text-center space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-iw-gold">CETADP — Confirmação de cadastro</p>
        <h1 className="text-lg font-bold text-iw-navy">{aluno.nome_completo}</h1>
        <p className="text-xs text-iw-muted">
          Matrícula {aluno.matricula}{aluno.curso_pretendido ? ` — ${aluno.curso_pretendido}` : ""}
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {/* Foto — accept="image/*" já oferece câmera ou galeria no celular */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-28 h-28 rounded-full border-[1.5px] border-iw-gold/40 flex items-center justify-center relative overflow-hidden">
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Sua foto" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-iw-muted">
                <Camera className="w-7 h-7" />
                <span className="text-[9px] font-semibold uppercase text-center px-2">Sua foto</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFoto}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-iw-muted">Toque pra tirar uma foto ou escolher da galeria</p>
        </div>

        <Field label="E-mail" required>
          <input name="email" type="email" required placeholder="seuemail@exemplo.com" className={bareCls} />
        </Field>
        <Field label="Telefone">
          <input
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className={bareCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de nascimento">
            <input name="data_nascimento" type="date" className={bareCls} />
          </Field>
          <Field label="Sexo">
            <select name="genero" defaultValue="" className={bareSelectCls}>
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="RG">
            <input name="rg" className={bareCls} />
          </Field>
          <Field label="Órgão">
            <input name="rg_orgao_emissor" defaultValue="SSP" className={bareCls} />
          </Field>
          <Field label="UF">
            <input name="rg_uf" maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
          </Field>
        </div>

        <Field label="Estado civil">
          <select name="estado_civil" defaultValue="" className={bareSelectCls}>
            <option value="">Selecione...</option>
            <option value="Solteiro(a)">Solteiro(a)</option>
            <option value="Casado(a)">Casado(a)</option>
            <option value="Divorciado(a)">Divorciado(a)</option>
            <option value="Viúvo(a)">Viúvo(a)</option>
          </select>
        </Field>

        <Field label="Nome da mãe">
          <input name="nome_mae" className={bareCls} />
        </Field>
        <Field label="Nome do pai">
          <input name="nome_pai" className={bareCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP">
            <input
              value={cep}
              maxLength={9}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                setCep(v);
              }}
              onBlur={handleBlurCep}
              placeholder={loadingCep ? "Buscando..." : "00000-000"}
              className={bareCls}
            />
          </Field>
          <Field label="Número">
            <input name="endereco_numero" className={bareCls} />
          </Field>
        </div>
        <Field label="Endereço">
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={bareCls} />
        </Field>
        <Field label="Complemento">
          <input name="endereco_complemento" className={bareCls} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bairro">
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={bareCls} />
          </Field>
          <Field label="Cidade">
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={bareCls} />
          </Field>
          <Field label="UF">
            <input value={estado} maxLength={2} onChange={(e) => setEstado(e.target.value.toUpperCase())} className={`${bareCls} uppercase text-center`} />
          </Field>
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            name="consentimento_lgpd_aceito"
            value="true"
            required
            className="mt-0.5 w-4 h-4 accent-iw-gold shrink-0"
          />
          <span className="text-xs text-iw-navy">
            Declaro que estou ciente das informações acima e autorizo o uso e tratamento dos meus dados
            pessoais para cadastro, de acordo com os artigos 7º e 11 da Lei nº 13.709/2018 (LGPD).
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-opacity border border-black"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="w-4 h-4" /> Concluir cadastro</>
          )}
        </button>
      </form>
    </div>
  );
}
