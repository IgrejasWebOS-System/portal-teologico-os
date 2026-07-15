"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, AlertTriangle, User, MapPin, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { matricularDiretoAction } from "../actions";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type Curso = { id: string; title: string; module: string };
type SelectItem = { id: string; name: string };

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

function maskRG(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 9);
  if (v.length > 7) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
  else if (v.length > 4) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}.${v.slice(2)}`;
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

function maskDate(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
}

function dateBrToIso(br: string): string {
  if (br.length !== 10) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;
const labelCls = "block text-xs font-bold text-iw-navy uppercase tracking-wider mb-1.5";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
      <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-iw-gold" />
      </div>
      <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">{label}</h2>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Matriculando...
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          Gerar matrícula
        </>
      )}
    </button>
  );
}

export default function NovaMatriculaForm({
  campos,
  cursos,
  errorMsg,
}: {
  campos: CampoMinisterio[];
  cursos: Curso[];
  errorMsg?: string;
}) {
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  const [generos, setGeneros] = useState<SelectItem[]>([]);
  const [estadosCivis, setEstadosCivis] = useState<SelectItem[]>([]);
  const [escolaridades, setEscolaridades] = useState<SelectItem[]>([]);
  const [profissoes, setProfissoes] = useState<SelectItem[]>([]);

  useEffect(() => {
    async function fetchDropdowns() {
      const supabase = createClient();
      const [g, e, s, p] = await Promise.all([
        supabase.from("settings_gender").select("id, name").order("name"),
        supabase.from("settings_civil_status").select("id, name").order("name"),
        supabase.from("settings_schooling").select("id, name").order("name"),
        supabase.from("settings_professions").select("id, name").order("name"),
      ]);
      if (g.data) setGeneros(g.data as SelectItem[]);
      if (e.data) setEstadosCivis(e.data as SelectItem[]);
      if (s.data) setEscolaridades(s.data as SelectItem[]);
      if (p.data) setProfissoes(p.data as SelectItem[]);
    }
    fetchDropdowns();
  }, []);

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
      // silencioso
    } finally {
      setLoadingCep(false);
    }
  };

  const cursosEscola = cursos.filter((c) => c.module === "escola");
  const cursosOutros = cursos.filter((c) => c.module !== "escola");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <Link
          href="/admin/matriculas"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Matrículas
        </Link>
        <h1 className="text-xl font-black text-iw-navy tracking-tight">Nova Matrícula Direta</h1>
        <p className="text-iw-muted text-xs mt-0.5">
          Cadastro completo do aluno + matrícula gerada na hora, sem passar pela inscrição pública nem pelo pagamento online.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form
        action={(fd: FormData) => {
          fd.set("cpf", cpf);
          fd.set("rg", rg);
          fd.set("telefone", telefone);
          fd.set("data_nascimento", dateBrToIso(dataNascimento));
          fd.set("cep", cep);
          fd.set("endereco", endereco);
          fd.set("bairro", bairro);
          fd.set("cidade", cidade);
          fd.set("estado", estado);
          return matricularDiretoAction(fd);
        }}
        className="space-y-6"
      >
        {/* Curso e vínculo */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader icon={GraduationCap} label="Curso e Vínculo" />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-7">
              <label className={labelCls}>Curso *</label>
              <select name="course_id" required className={selectCls} defaultValue="">
                <option value="" disabled>Selecione o curso</option>
                {cursosEscola.length > 0 && (
                  <optgroup label="Escola Teológica">
                    {cursosEscola.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
                {cursosOutros.length > 0 && (
                  <optgroup label="Cursos & Treinamentos">
                    {cursosOutros.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="col-span-12 md:col-span-5">
              <label className={labelCls}>Campo / Ministério</label>
              <select name="campo_ministerio_id" className={selectCls} defaultValue="">
                <option value="">Selecione (opcional)</option>
                {campos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader icon={User} label="Dados Pessoais" />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label className={labelCls}>Nome completo *</label>
              <input name="nome_completo" required className={inputCls} placeholder="Nome completo do aluno" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>CPF *</label>
              <input
                required
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                className={inputCls}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Data de nascimento</label>
              <input
                value={dataNascimento}
                maxLength={10}
                onChange={(e) => setDataNascimento(maskDate(e.target.value))}
                className={`${inputCls} text-center`}
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>E-mail *</label>
              <input name="email" type="email" required className={inputCls} placeholder="aluno@email.com" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Telefone</label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                className={inputCls}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>RG</label>
              <input
                value={rg}
                onChange={(e) => setRg(maskRG(e.target.value))}
                className={inputCls}
                placeholder="00.000.000-0"
              />
            </div>
            <div className="col-span-6 md:col-span-1">
              <label className={labelCls}>Órgão</label>
              <input name="rg_orgao_emissor" defaultValue="SSP" className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>UF do RG</label>
              <input name="rg_uf" maxLength={2} defaultValue="SP" className={`${inputCls} uppercase`} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Gênero</label>
              <select name="genero" className={selectCls} defaultValue="">
                <option value="">Selecione...</option>
                {generos.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Estado civil</label>
              <select name="estado_civil" className={selectCls} defaultValue="">
                <option value="">Selecione...</option>
                {estadosCivis.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Escolaridade</label>
              <select name="escolaridade" className={selectCls} defaultValue="">
                <option value="">Selecione...</option>
                {escolaridades.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Profissão</label>
              <select name="profissao" className={selectCls} defaultValue="">
                <option value="">Selecione...</option>
                {profissoes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>Naturalidade — cidade</label>
              <input name="naturalidade_cidade" className={inputCls} placeholder="Cidade de nascimento" />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>UF naturalidade</label>
              <input name="naturalidade_estado" maxLength={2} className={`${inputCls} uppercase`} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Nome da mãe</label>
              <input name="nome_mae" className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Nome do pai</label>
              <input name="nome_pai" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Cônjuge (se houver)</label>
            <input name="nome_conjuge" className={inputCls} />
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader icon={MapPin} label="Endereço" />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>CEP</label>
              <input
                value={cep}
                maxLength={9}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                  setCep(v);
                }}
                onBlur={handleBlurCep}
                className={inputCls}
                placeholder={loadingCep ? "Buscando..." : "00000-000"}
              />
            </div>
            <div className="col-span-12 md:col-span-7">
              <label className={labelCls}>Endereço</label>
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Número</label>
              <input name="endereco_numero" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>Complemento</label>
              <input name="endereco_complemento" className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>Bairro</label>
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-1">
              <label className={labelCls}>UF</label>
              <input
                value={estado}
                maxLength={2}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                className={`${inputCls} uppercase text-center`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
