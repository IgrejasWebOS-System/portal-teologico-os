"use client";

// ============================================================
// DEPRECADO (15/09/2026) — o cadastro foi unificado num componente só:
// ver ProfessorForm.tsx (usado tanto em /novo/membro quanto em
// /novo/externo, com a prop `mostrarBusca` decidindo se aparece o campo
// de busca por matrícula/CPF/nome). Este arquivo não é mais importado
// em nenhuma rota — mantido só pra não perder o histórico; pode ser
// removido com segurança quando o Joaquim confirmar.
// ============================================================

import { useMemo, useRef, useState, useTransition, type FocusEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Save, Loader2, AlertTriangle, User, Phone, Briefcase, Map, Church, Building,
  Mail, ShieldCheck, FileText, MapPin,
} from "lucide-react";
import { addProfessorAction, updateProfessorAction } from "../actions";
import { ancestryChain, SUB_UNIT_TYPES, type UnitNode } from "../unitsChain";

type SelectItem = { id: string; name: string };

export type ExistingProfessorExterno = {
  id: string;
  unitId: string | null;
  matricula: string | null;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  cpf: string | null;
  rg: string | null;
  rgOrgaoEmissor: string | null;
  rgUf: string | null;
  dataNascimento: string | null;
  genero: string | null;
  estadoCivil: string | null;
  escolaridade: string | null;
  profissao: string | null;
  naturalidadeCidade: string | null;
  naturalidadeEstado: string | null;
  nacionalidade: string | null;
  nomeConjuge: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  cep: string | null;
  endereco: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

interface Props {
  units: UnitNode[];
  generos: SelectItem[];
  estadosCivis: SelectItem[];
  escolaridades: SelectItem[];
  existing?: ExistingProfessorExterno;
  submitLabel?: string;
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const sectionTitleCls =
  "flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-4 pb-2 border-b border-iw-border";

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

export default function ProfessorExternoForm({
  units, generos, estadosCivis, escolaridades, existing, submitLabel = "Cadastrar Professor",
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const cadeiaInicial = useMemo(() => ancestryChain(existing?.unitId, units), [existing?.unitId, units]);

  const [campoId, setCampoId] = useState(cadeiaInicial.find((u) => u.type === "CAMPO")?.id ?? "");
  const [setorId, setSetorId] = useState(cadeiaInicial.find((u) => u.type === "SETOR")?.id ?? "");
  const [igrejaId, setIgrejaId] = useState(cadeiaInicial.find((u) => u.type === "IGREJA")?.id ?? "");
  const [subunidadeId, setSubunidadeId] = useState(
    cadeiaInicial.find((u) => SUB_UNIT_TYPES.includes(u.type))?.id ?? ""
  );
  const [atuaNaSede, setAtuaNaSede] = useState(
    cadeiaInicial.length > 0 && cadeiaInicial[cadeiaInicial.length - 1]?.type === "SEDE"
  );

  const [nome, setNome] = useState(existing?.nome ?? "");
  const [cargo, setCargo] = useState(existing?.cargo ?? "");
  const [telefone, setTelefone] = useState(existing?.telefone ?? "");
  const [cpf, setCpf] = useState(existing?.cpf ?? "");
  const [rg, setRg] = useState(existing?.rg ?? "");
  const [genero, setGenero] = useState(existing?.genero ?? "");
  const [estadoCivil, setEstadoCivil] = useState(existing?.estadoCivil ?? "");
  const [escolaridadeSel, setEscolaridadeSel] = useState(existing?.escolaridade ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [avisoAcesso, setAvisoAcesso] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [isPending, startTransition] = useTransition();

  const campos = useMemo(() => units.filter((u) => u.type === "CAMPO"), [units]);
  const sedeDoCampo = useMemo(() => units.find((u) => u.type === "SEDE" && u.parent_id === campoId), [units, campoId]);
  const setores = useMemo(
    () => (sedeDoCampo ? units.filter((u) => u.type === "SETOR" && u.parent_id === sedeDoCampo.id) : []),
    [units, sedeDoCampo]
  );
  const igrejas = useMemo(() => (setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []), [units, setorId]);
  const subunidades = useMemo(
    () => (igrejaId ? units.filter((u) => SUB_UNIT_TYPES.includes(u.type) && u.parent_id === igrejaId) : []),
    [units, igrejaId]
  );

  const finalUnitId = atuaNaSede ? (sedeDoCampo?.id ?? "") : (subunidadeId || igrejaId);

  const preencherCampoCru = (name: string, valor: string | null) => {
    if (!valor || !formRef.current) return;
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | null;
    if (el) el.value = valor;
  };

  const handleBlurCep = async (e: FocusEvent<HTMLInputElement>) => {
    const cepLimpo = e.target.value.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        preencherCampoCru("endereco", data.logradouro?.toUpperCase() || null);
        preencherCampoCru("bairro", data.bairro?.toUpperCase() || null);
        preencherCampoCru("cidade", data.localidade?.toUpperCase() || null);
        preencherCampoCru("estado", data.uf?.toUpperCase() || null);
        const complementoInput = formRef.current?.elements.namedItem("endereco_complemento") as HTMLInputElement | null;
        if (complementoInput) complementoInput.value = data.complemento?.toUpperCase() || "";
      }
    } catch {
      // silencioso — campos continuam editáveis manualmente
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = (fd: FormData) => {
    if (!nome.trim()) { setError("Digite o nome do professor."); return; }
    if (!finalUnitId) { setError("Selecione ao menos Campo, Setor e Igreja."); return; }
    setError("");
    setAvisoAcesso("");
    fd.set("nome_completo", nome.trim());
    fd.set("cargo", cargo);
    fd.set("telefone", telefone);
    fd.set("tipo_professor", "EXTERNO");
    // O código de cadastro é gerado só na criação (addProfessorAction) —
    // numa edição, manda de volta o mesmo, senão ele seria apagado.
    fd.set("matricula", existing?.matricula ?? "");
    fd.set("unit_id", finalUnitId);
    fd.set("setor_unit_id", setorId);
    fd.set("email", email.trim());
    fd.set("cpf", cpf);
    fd.set("rg", rg);
    fd.set("genero", genero);
    fd.set("estado_civil", estadoCivil);
    fd.set("escolaridade", escolaridadeSel);
    if (existing) fd.set("id", existing.id);

    startTransition(async () => {
      const res = existing ? await updateProfessorAction(fd) : await addProfessorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      if (res.message) setAvisoAcesso(res.message);
      router.push("/dashboard/configuracoes/professores");
      router.refresh();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!existing && (
        <p className="text-xs text-iw-muted bg-iw-bg border border-iw-border rounded-xl px-4 py-2.5">
          Este cadastro é pra professor de fora, que não tem cadastro de membro nesta igreja.
          Se ele for membro,{" "}
          <Link href="/dashboard/configuracoes/professores/novo/membro" className="text-iw-navy font-semibold hover:underline">
            cadastre como Professor membro
          </Link>.
        </p>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building className="w-4 h-4 text-iw-navy" />
          Onde ele dá aula (Campo, Setor e Igreja)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Building className="w-3 h-3" /> Campo</span></label>
            <select
              value={campoId}
              onChange={(e) => { setCampoId(e.target.value); setSetorId(""); setIgrejaId(""); setSubunidadeId(""); setAtuaNaSede(false); }}
              className={selectCls}
            >
              <option value="">Selecione o campo...</option>
              {campos.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span></label>
            <select
              value={setorId}
              onChange={(e) => { setSetorId(e.target.value); setIgrejaId(""); setSubunidadeId(""); }}
              disabled={!campoId || atuaNaSede}
              className={selectCls}
            >
              <option value="">{campoId ? "Selecione o setor..." : "Escolha o campo primeiro"}</option>
              {setores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>

          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span></label>
            <select
              value={igrejaId}
              onChange={(e) => { setIgrejaId(e.target.value); setSubunidadeId(""); }}
              disabled={!setorId || atuaNaSede}
              className={selectCls}
            >
              <option value="">{setorId ? "Selecione a igreja..." : "Escolha o setor primeiro"}</option>
              {igrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Sub-unidade (opcional)</label>
            <select
              value={subunidadeId}
              onChange={(e) => setSubunidadeId(e.target.value)}
              disabled={!igrejaId || subunidades.length === 0 || atuaNaSede}
              className={selectCls}
            >
              <option value="">{subunidades.length === 0 ? "Nenhuma — vinculado à igreja" : "Vinculado à igreja"}</option>
              {subunidades.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.type})</option>))}
            </select>
          </div>
        </div>

        {sedeDoCampo && (
          <label className="flex items-center gap-2 text-xs font-semibold text-iw-navy bg-iw-blue/5 border border-iw-blue/20 rounded-xl px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={atuaNaSede}
              onChange={(e) => {
                const marcado = e.target.checked;
                setAtuaNaSede(marcado);
                if (marcado) { setSetorId(""); setIgrejaId(""); setSubunidadeId(""); }
              }}
              className="w-4 h-4 accent-iw-blue"
            />
            Atua na própria Igreja Sede do Campo ({sedeDoCampo.name}) — não em um Setor/Igreja abaixo dela
          </label>
        )}
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <User className="w-4 h-4 text-iw-gold" />
          Dados do professor
        </h3>

        {existing?.matricula && (
          <p className="text-xs text-iw-muted">
            Código de cadastro: <span className="font-bold text-iw-navy">{existing.matricula}</span>
          </p>
        )}
        {!existing && (
          <p className="text-xs text-iw-muted">
            O código de cadastro é gerado automaticamente ao salvar.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className={labelCls}><span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Nome Completo *</span></label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do professor"
              className={`${inputCls} uppercase`}
              required
            />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" /> Cargo</span></label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value.toUpperCase())}
              placeholder="Ex: Professor(a) convidado(a)"
              className={`${inputCls} uppercase`}
            />
          </div>
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</span></label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <FileText className="w-4 h-4 text-iw-navy" />
          Ficha completa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>CPF</label>
            <input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>RG</label>
            <input value={rg} onChange={(e) => setRg(maskRG(e.target.value))} placeholder="00.000.000-0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Órgão emissor</label>
            <input name="rg_orgao_emissor" defaultValue={existing?.rgOrgaoEmissor ?? "SSP"} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>UF do RG</label>
            <input name="rg_uf" maxLength={2} defaultValue={existing?.rgUf ?? "SP"} className={`${inputCls} uppercase`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Data de nascimento</label>
            <input type="date" name="data_nascimento" defaultValue={existing?.dataNascimento ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gênero</label>
            <select value={genero} onChange={(e) => setGenero(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {generos.map((g) => (<option key={g.id} value={g.name}>{g.name}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado civil</label>
            <select value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {estadosCivis.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Escolaridade</label>
            <select value={escolaridadeSel} onChange={(e) => setEscolaridadeSel(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {escolaridades.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Profissão</label>
            <input name="profissao" defaultValue={existing?.profissao ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Naturalidade (cidade)</label>
            <input name="naturalidade_cidade" defaultValue={existing?.naturalidadeCidade ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>UF de nascimento</label>
            <input name="naturalidade_estado" maxLength={2} defaultValue={existing?.naturalidadeEstado ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Nacionalidade</label>
            <input name="nacionalidade" defaultValue={existing?.nacionalidade ?? "Brasileira"} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Cônjuge (se houver)</label>
            <input name="nome_conjuge" defaultValue={existing?.nomeConjuge ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Mãe</label>
            <input name="nome_mae" defaultValue={existing?.nomeMae ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Pai</label>
            <input name="nome_pai" defaultValue={existing?.nomePai ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <MapPin className="w-4 h-4 text-iw-success" />
          Endereço
        </h3>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>CEP</label>
            <input
              name="cep"
              defaultValue={existing?.cep ?? ""}
              onBlur={handleBlurCep}
              placeholder={loadingCep ? "Buscando..." : "00000-000"}
              maxLength={9}
              className={inputCls}
            />
          </div>
          <div className="col-span-12 sm:col-span-7">
            <label className={labelCls}>Endereço</label>
            <input name="endereco" defaultValue={existing?.endereco ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>Número</label>
            <input name="endereco_numero" defaultValue={existing?.enderecoNumero ?? ""} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Complemento</label>
            <input name="endereco_complemento" defaultValue={existing?.enderecoComplemento ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input name="bairro" defaultValue={existing?.bairro ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <label className={labelCls}>Cidade</label>
            <input name="cidade" defaultValue={existing?.cidade ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>UF</label>
            <input name="estado" maxLength={2} defaultValue={existing?.estado ?? ""} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <ShieldCheck className="w-4 h-4 text-iw-gold" />
          Acesso ao núcleo de ensino (opcional)
        </h3>
        <p className="text-xs text-iw-muted -mt-2">
          Se preencher o e-mail abaixo, essa pessoa recebe (ou já tem) acesso pra gerenciar
          sozinha este núcleo — matrículas, turmas e alunos só dele — nível 4, escopado a
          Campo/Setor/Igreja/Sub-unidade selecionados acima. Deixe em branco se o professor
          só vai aparecer no cadastro, sem login.
        </p>
        <div className="max-w-sm">
          <label className={labelCls}><span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail de acesso</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="professor@exemplo.com" className={inputCls} />
        </div>
        {avisoAcesso && <p className="text-xs font-semibold text-iw-success">{avisoAcesso}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Link
          href="/dashboard/configuracoes/professores"
          className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
