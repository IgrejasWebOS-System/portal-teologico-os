"use client";

import { useState } from "react";
import { Building, MapPin, Phone, User, Mail, Loader2 } from "lucide-react";
import { criarCampoAction, atualizarCampoAction } from "./actions";
import MatriculaLookup from "../../MatriculaLookup";
import type { MembroEncontrado } from "../../actions";

function formatarTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const sectionTitleCls =
  "flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-4 pb-2 border-b border-iw-border";

type CampoData = {
  campoId: string;
  sedeId: string;
  churchId: string | null;
  nomeCampo: string;
  nomeSede: string;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone?: string | null;
  contato?: string | null;
  email?: string | null;
};

interface Props {
  existing?: CampoData;
  submitLabel?: string;
}

export default function CampoForm({ existing, submitLabel = "Cadastrar Campo" }: Props) {
  const action = existing ? atualizarCampoAction : criarCampoAction;

  const [cep, setCep] = useState(existing?.cep ?? "");
  const [endereco, setEndereco] = useState(existing?.endereco ?? "");
  const [bairro, setBairro] = useState(existing?.bairro ?? "");
  const [cidade, setCidade] = useState(existing?.cidade ?? "");
  const [uf, setUf] = useState(existing?.uf ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [numero, setNumero] = useState(existing?.numero ?? "");
  const [contato, setContato] = useState(existing?.contato ?? "");
  const [telefone, setTelefone] = useState(formatarTelefone(existing?.telefone ?? ""));
  const [email, setEmail] = useState(existing?.email ?? "");

  const handleMembroEncontrado = (membro: MembroEncontrado) => {
    setContato(membro.full_name);
    if (membro.phone) setTelefone(formatarTelefone(membro.phone));
    if (membro.email) setEmail(membro.email);
  };

  const buscarCep = async (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length !== 8) return;

    setBuscandoCep(true);
    setCepErro("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepErro("CEP não encontrado.");
        return;
      }
      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setUf(data.uf || "");
    } catch {
      setCepErro("Não foi possível buscar o CEP agora — preencha manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <form action={action} className="space-y-6">
      {existing && (
        <>
          <input type="hidden" name="campo_id" value={existing.campoId} />
          <input type="hidden" name="sede_id" value={existing.sedeId} />
          <input type="hidden" name="church_id" value={existing.churchId ?? ""} />
        </>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building className="w-4 h-4 text-iw-blue" />
          Identificação
        </h3>

        <div>
          <label className={labelCls}>Nome do Campo *</label>
          <input
            name="nome_campo"
            type="text"
            required
            defaultValue={existing?.nomeCampo}
            placeholder="Ex: ADBRAS Caruaru Ministério Madureira"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Nome da Sede *</label>
          <input
            name="nome_sede"
            type="text"
            required
            defaultValue={existing?.nomeSede}
            placeholder="Ex: ADBRAS Sede Caruaru"
            className={inputCls}
          />
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <MapPin className="w-4 h-4 text-iw-gold" />
          Endereço da Sede
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-3">
            <label className={labelCls}>
              CEP {buscandoCep && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
            </label>
            <input
              name="cep"
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onBlur={(e) => buscarCep(e.target.value)}
              placeholder="00000-000"
              className={inputCls}
            />
            {cepErro && <p className="text-[11px] text-iw-error mt-1">{cepErro}</p>}
          </div>
          <div className="sm:col-span-6">
            <label className={labelCls}>Endereço</label>
            <input
              name="endereco"
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, Avenida..."
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>Número</label>
            <input name="numero" type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-3">
            <label className={labelCls}>Complemento</label>
            <input name="complemento" type="text" defaultValue={existing?.complemento ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input
              name="bairro"
              type="text"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-4">
            <label className={labelCls}>Cidade</label>
            <input
              name="cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>UF</label>
            <input
              name="uf"
              type="text"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              placeholder="SP"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              name="telefone"
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <Mail className="w-3 h-3 inline mr-1" />
              E-mail
            </label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@campo.org"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Phone className="w-4 h-4 text-iw-blue" />
          Contato
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MatriculaLookup onFound={handleMembroEncontrado} onClear={() => {}} />
          <div>
            <label className={labelCls}>
              <User className="w-3 h-3 inline mr-1" />
              Contato / Responsável
            </label>
            <input
              name="contato"
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Nome do responsável"
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-[11px] text-iw-muted">
          Ao buscar por matrícula, o telefone e o e-mail acima (em Endereço da Sede) são preenchidos automaticamente.
        </p>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-iw-navy text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-iw-navy/90 transition-colors"
      >
        <Building className="w-4 h-4" />
        {submitLabel}
      </button>
    </form>
  );
}
