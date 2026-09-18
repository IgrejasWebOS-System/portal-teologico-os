"use client";

// ============================================================
// Cadastro único de Professor (15/09/2026) — unifica o que antes eram
// duas telas (Membro / Externo) numa só, com a mesma estrutura completa
// de ficha nos dois casos: busca por matrícula/CPF/nome preenche tudo
// automaticamente se achar; se não achar (ou o campo de busca ficar em
// branco), a secretaria preenche a ficha na mão. Os dados de ficha
// (CPF, RG, endereço etc.) sempre ficam gravados na própria linha de
// `professores` — não dependem mais de uma leitura ao vivo de `members`.
//
// `mostrarBusca=false` esconde o campo de busca (usado na tela "Professor
// de fora", que já assume de cara que a pessoa não é membro).
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Save, Loader2, AlertTriangle, User, Phone, Briefcase, Map, Church, Building,
  Mail, ShieldCheck, FileText, MapPin,
} from "lucide-react";
import BuscaProfessorCompleta from "./BuscaProfessorCompleta";
import { addProfessorAction, updateProfessorAction, type MembroCompletoEncontrado } from "../actions";
import { ancestryChain, type UnitNode } from "../unitsChain";
import { createClient } from "@/utils/supabase/client";
import { validarCPF } from "@/utils/cpf";

type ChurchLink = { id: string; unit_id: string | null };
type SelectItem = { id: string; name: string };
type EstadoIBGE = { id: number; sigla: string; nome: string };
// Lista nacional de municípios (pra digitar/escolher a cidade e a UF sair
// sozinha) — ver comentário na busca de naturalidade, mais abaixo.
type CidadeComUf = { nome: string; uf: string };

export type ExistingProfessor = {
  id: string;
  unitId: string | null;
  memberId: string | null;
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
  churches: ChurchLink[];
  generos: SelectItem[];
  estadosCivis: SelectItem[];
  escolaridades: SelectItem[];
  profissoes: SelectItem[];
  cargos: SelectItem[];
  existing?: ExistingProfessor;
  submitLabel?: string;
  mostrarBusca?: boolean;
}

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const inputErrCls =
  "w-full bg-white border border-iw-error rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-error focus:outline-none focus:ring-2 focus:ring-iw-error/20 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors";
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

export default function ProfessorForm({
  units, churches, generos, estadosCivis, escolaridades, profissoes, cargos, existing, submitLabel = "Cadastrar Professor", mostrarBusca = true,
}: Props) {
  const router = useRouter();

  const cadeiaInicial = useMemo(() => ancestryChain(existing?.unitId, units), [existing?.unitId, units]);

  // Único Campo existente hoje é "Campo AD Brás Piracicaba" — pré-seleciona
  // ele por padrão (pode trocar se um dia existir mais de um Campo), pra
  // não obrigar a secretaria a clicar num dropdown de opção única toda vez.
  const campoPadraoId = useMemo(() => units.find((u) => u.type === "CAMPO")?.id ?? "", [units]);

  const [campoId, setCampoId] = useState(cadeiaInicial.find((u) => u.type === "CAMPO")?.id ?? campoPadraoId);
  const [setorId, setSetorId] = useState(cadeiaInicial.find((u) => u.type === "SETOR")?.id ?? "");
  const [igrejaId, setIgrejaId] = useState(cadeiaInicial.find((u) => u.type === "IGREJA")?.id ?? "");
  // Sede não é Setor nem Regional (fica acima desse nível), mas entra como
  // opção direto no mesmo seletor de Setor — selecionar ela marca este
  // flag e trava Igreja (a "igreja" nesse caso é a própria Sede).
  const [atuaNaSede, setAtuaNaSede] = useState(
    cadeiaInicial.length > 0 && cadeiaInicial[cadeiaInicial.length - 1]?.type === "SEDE"
  );

  const [memberId, setMemberId] = useState(existing?.memberId ?? "");
  const [matricula, setMatricula] = useState(existing?.matricula ?? "");
  const [nome, setNome] = useState(existing?.nome ?? "");
  const [cargo, setCargo] = useState(existing?.cargo ?? "");
  const [telefone, setTelefone] = useState(existing?.telefone ?? "");
  const [cpf, setCpf] = useState(existing?.cpf ?? "");
  const [rg, setRg] = useState(existing?.rg ?? "");
  const [rgOrgaoEmissor, setRgOrgaoEmissor] = useState(existing?.rgOrgaoEmissor ?? "SSP");
  const [rgUf, setRgUf] = useState(existing?.rgUf ?? "SP");
  const [dataNascimento, setDataNascimento] = useState(existing?.dataNascimento ?? "");
  const [genero, setGenero] = useState(existing?.genero ?? "");
  const [estadoCivil, setEstadoCivil] = useState(existing?.estadoCivil ?? "");
  const [escolaridadeSel, setEscolaridadeSel] = useState(existing?.escolaridade ?? "");
  const [profissao, setProfissao] = useState(existing?.profissao ?? "");
  const [naturalidadeCidade, setNaturalidadeCidade] = useState(existing?.naturalidadeCidade ?? "");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState(existing?.naturalidadeEstado ?? "");
  const [nacionalidade, setNacionalidade] = useState(existing?.nacionalidade ?? "Brasileira");
  const [nomeConjuge, setNomeConjuge] = useState(existing?.nomeConjuge ?? "");
  const [nomeMae, setNomeMae] = useState(existing?.nomeMae ?? "");
  const [nomePai, setNomePai] = useState(existing?.nomePai ?? "");
  const [cep, setCep] = useState(existing?.cep ?? "");
  const [endereco, setEndereco] = useState(existing?.endereco ?? "");
  const [enderecoNumero, setEnderecoNumero] = useState(existing?.enderecoNumero ?? "");
  const [enderecoComplemento, setEnderecoComplemento] = useState(existing?.enderecoComplemento ?? "");
  const [bairro, setBairro] = useState(existing?.bairro ?? "");
  const [cidade, setCidade] = useState(existing?.cidade ?? "");
  const [estado, setEstado] = useState(existing?.estado ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [avisoAcesso, setAvisoAcesso] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [cpfError, setCpfError] = useState("");

  // UF ainda entra manualmente (DF, ou quando a cidade não bate no
  // catálogo), mas Naturalidade agora busca por CIDADE primeiro (pedido do
  // Joaquim, 18/09/2026): lista nacional de municípios (IBGE, endpoint
  // plano — todas as ~5.570 cidades numa chamada só, cacheada em estado)
  // + as regiões administrativas do DF (settings_custom_regions, mesmo
  // motivo de sempre: o IBGE não separa Brasília em regiões). Ao digitar/
  // escolher a cidade no datalist, a UF é preenchida sozinha.
  const [states, setStates] = useState<EstadoIBGE[]>([]);
  const [catalogoCidades, setCatalogoCidades] = useState<CidadeComUf[]>([]);

  useEffect(() => {
    async function fetchEstados() {
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        setStates(await res.json());
      } catch {
        // silencioso — UF continua editável, só sem a lista pronta
      }
    }
    fetchEstados();

    async function fetchCatalogoCidades() {
      try {
        const resMunicipios = await fetch(
          "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
        );
        const municipios: { nome: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } } }[] =
          await resMunicipios.json();
        const doIbge: CidadeComUf[] = municipios
          .filter((m) => m.microrregiao?.mesorregiao?.UF?.sigla)
          .map((m) => ({ nome: m.nome, uf: m.microrregiao!.mesorregiao!.UF!.sigla! }));

        const supabase = createClient();
        const { data: regioesDf } = await supabase
          .from("settings_custom_regions")
          .select("name")
          .eq("state_uf", "DF");
        const doDf: CidadeComUf[] = (regioesDf ?? []).map((r) => ({ nome: r.name, uf: "DF" }));

        setCatalogoCidades([...doIbge, ...doDf].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      } catch {
        // silencioso — Cidade/UF continuam editáveis na mão
      }
    }
    fetchCatalogoCidades();
  }, []);

  // Ao digitar/escolher no datalist, se o texto bater "Nome (UF)" com uma
  // cidade do catálogo, preenche a UF sozinha; senão deixa como o usuário
  // digitou (nome livre) e a UF continua editável manualmente.
  const handleNaturalidadeCidadeChange = (valorDigitado: string) => {
    const match = catalogoCidades.find((c) => `${c.nome} (${c.uf})` === valorDigitado || c.nome === valorDigitado);
    if (match) {
      setNaturalidadeCidade(match.nome.toUpperCase());
      setNaturalidadeEstado(match.uf);
    } else {
      setNaturalidadeCidade(valorDigitado.toUpperCase());
    }
  };

  const checkCpfExists = async (cpfVal: string) => {
    const digitos = cpfVal.replace(/\D/g, "");
    if (!digitos) { setCpfError(""); return; }
    if (digitos.length < 11) { setCpfError(""); return; }
    if (!validarCPF(cpfVal)) { setCpfError("CPF inválido — confira os números digitados."); return; }
    const supabase = createClient();
    let query = supabase.from("professores").select("id").eq("cpf", cpfVal);
    if (existing?.id) query = query.neq("id", existing.id);
    const { data } = await query.maybeSingle();
    setCpfError(data ? "Este CPF já está cadastrado para outro professor." : "");
  };

  const campos = useMemo(() => units.filter((u) => u.type === "CAMPO"), [units]);
  const sedeDoCampo = useMemo(() => units.find((u) => u.type === "SEDE" && u.parent_id === campoId), [units, campoId]);
  const setores = useMemo(
    () => (sedeDoCampo ? units.filter((u) => u.type === "SETOR" && u.parent_id === sedeDoCampo.id) : []),
    [units, sedeDoCampo]
  );
  const igrejas = useMemo(() => (setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []), [units, setorId]);

  const finalUnitId = atuaNaSede ? (sedeDoCampo?.id ?? "") : igrejaId;

  const handleSetorChange = (value: string) => {
    if (sedeDoCampo && value === sedeDoCampo.id) {
      setAtuaNaSede(true);
      setSetorId("");
      setIgrejaId("");
    } else {
      setAtuaNaSede(false);
      setSetorId(value);
      setIgrejaId("");
    }
  };

  const handleMembroEncontrado = (m: MembroCompletoEncontrado) => {
    setMemberId(m.id);
    setMatricula(m.registration_number ?? "");
    setNome(m.full_name.toUpperCase());
    setCargo(m.cargo ?? "");
    setTelefone(m.phone ?? "");
    setCpf(m.cpf ?? "");
    setRg(m.rg ?? "");
    setRgOrgaoEmissor(m.rg_issuer ?? "SSP");
    setRgUf(m.rg_state ?? "SP");
    setDataNascimento(m.birth_date ?? "");
    setGenero(m.gender ?? "");
    setEstadoCivil(m.civil_status ?? "");
    setEscolaridadeSel(m.schooling ?? "");
    setProfissao(m.profession ?? "");
    setNaturalidadeCidade(m.nationality_city ?? "");
    setNaturalidadeEstado(m.nationality_state ?? "");
    setNacionalidade(m.nationality ?? "Brasileira");
    setNomeConjuge(m.spouse_name ?? "");
    setNomeMae(m.mother_name ?? "");
    setNomePai(m.father_name ?? "");
    setCep(m.zip_code ?? "");
    setEndereco(m.address ?? "");
    setBairro(m.neighborhood ?? "");
    setCidade(m.city ?? "");
    setEstado(m.state ?? "");

    const church = churches.find((c) => c.id === m.church_id);
    if (church?.unit_id) {
      const chain = ancestryChain(church.unit_id, units);
      const ehSede = chain.find((u) => u.id === church.unit_id)?.type === "SEDE";
      setCampoId(chain.find((u) => u.type === "CAMPO")?.id ?? campoPadraoId);
      setAtuaNaSede(ehSede);
      setSetorId(ehSede ? "" : chain.find((u) => u.type === "SETOR")?.id ?? "");
      setIgrejaId(ehSede ? "" : chain.find((u) => u.type === "IGREJA")?.id ?? "");
    }
  };

  const handleLimparBusca = () => {
    setMemberId("");
    setMatricula("");
  };

  const preencherCepDireto = (setter: (v: string) => void, valor: string | null) => {
    if (valor) setter(valor.toUpperCase());
  };

  const handleBlurCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (!cepLimpo) { setCepError(""); return; }
    if (cepLimpo.length !== 8) { setCepError("CEP incompleto — precisa ter 8 números."); return; }
    setCepError("");
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado — confira os números ou preencha o endereço na mão.");
      } else {
        preencherCepDireto(setEndereco, data.logradouro || null);
        preencherCepDireto(setBairro, data.bairro || null);
        preencherCepDireto(setCidade, data.localidade || null);
        preencherCepDireto(setEstado, data.uf || null);
        setEnderecoComplemento(data.complemento?.toUpperCase() || "");
      }
    } catch {
      setCepError("Não foi possível consultar o CEP agora — preencha o endereço na mão.");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = (fd: FormData) => {
    if (!nome.trim()) { setError("Busque o professor ou digite o nome manualmente."); return; }
    if (!finalUnitId) { setError("Selecione ao menos Campo, Setor e Igreja."); return; }
    if (cpfError) { setError("Corrija o CPF antes de salvar."); return; }
    if (cepError) { setError("Corrija o CEP antes de salvar."); return; }
    // Acesso ao núcleo de ensino virou obrigatório pra CADASTRO NOVO
    // (pedido do Joaquim, 18/09/2026): todo professor novo já sai com
    // login (nível 4, escopado a este núcleo). Em edição não é retroativo
    // -- professor antigo sem e-mail continua editável sem travar por
    // isso (senão a secretaria não conseguiria nem corrigir telefone de
    // quem foi cadastrado antes dessa regra existir).
    if (!existing && (!email.trim() || !email.includes("@"))) {
      setError("Informe um e-mail válido — o acesso ao núcleo de ensino é obrigatório em cadastros novos.");
      return;
    }
    setError("");
    setAvisoAcesso("");

    fd.set("nome_completo", nome.trim());
    fd.set("cargo", cargo);
    fd.set("telefone", telefone);
    fd.set("member_id", memberId);
    fd.set("matricula", matricula);
    fd.set("tipo_professor", memberId ? "MEMBRO" : "EXTERNO");
    fd.set("unit_id", finalUnitId);
    fd.set("setor_unit_id", setorId);
    fd.set("email", email.trim());
    fd.set("cpf", cpf);
    fd.set("rg", rg);
    fd.set("rg_orgao_emissor", rgOrgaoEmissor);
    fd.set("rg_uf", rgUf);
    fd.set("data_nascimento", dataNascimento);
    fd.set("genero", genero);
    fd.set("estado_civil", estadoCivil);
    fd.set("escolaridade", escolaridadeSel);
    fd.set("profissao", profissao);
    fd.set("naturalidade_cidade", naturalidadeCidade);
    fd.set("naturalidade_estado", naturalidadeEstado);
    fd.set("nacionalidade", nacionalidade);
    fd.set("nome_conjuge", nomeConjuge);
    fd.set("nome_mae", nomeMae);
    fd.set("nome_pai", nomePai);
    fd.set("cep", cep);
    fd.set("endereco", endereco);
    fd.set("endereco_numero", enderecoNumero);
    fd.set("endereco_complemento", enderecoComplemento);
    fd.set("bairro", bairro);
    fd.set("cidade", cidade);
    fd.set("estado", estado);
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
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building className="w-4 h-4 text-iw-navy" />
          Campo, Setor e Igreja
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Building className="w-3 h-3" /> Campo</span></label>
            <select
              value={campoId}
              onChange={(e) => { setCampoId(e.target.value); setSetorId(""); setIgrejaId(""); setAtuaNaSede(false); }}
              className={selectCls}
            >
              <option value="">Selecione o campo...</option>
              {campos.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span></label>
            <select
              value={atuaNaSede ? (sedeDoCampo?.id ?? "") : setorId}
              onChange={(e) => handleSetorChange(e.target.value)}
              disabled={!campoId}
              className={selectCls}
            >
              <option value="">{campoId ? "Selecione o setor..." : "Escolha o campo primeiro"}</option>
              {sedeDoCampo && <option value={sedeDoCampo.id}>SEDE — {sedeDoCampo.name}</option>}
              {/* Só "REGIONAL NNN"/"SETOR NNN" entram nos grupos -- linhas de
                  unidade mal cadastradas (ex.: nome "001" sem o prefixo, sem
                  nenhum vínculo hoje) ficam de fora em vez de aparecer soltas
                  no fim da lista. */}
              <optgroup label="Regional">
                {setores
                  .filter((s) => /^REGIONAL\s+\d+/i.test(s.name))
                  .map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </optgroup>
              <optgroup label="Setor">
                {setores
                  .filter((s) => /^SETOR\s+\d+/i.test(s.name))
                  .map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className={labelCls}><span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span></label>
            <select
              value={igrejaId}
              onChange={(e) => setIgrejaId(e.target.value)}
              disabled={!setorId || atuaNaSede}
              className={selectCls}
            >
              <option value="">
                {atuaNaSede ? "SEDE selecionada acima" : setorId ? "Selecione a igreja..." : "Escolha o setor primeiro"}
              </option>
              {igrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </div>

          {mostrarBusca ? (
            <BuscaProfessorCompleta onEncontrado={handleMembroEncontrado} onLimpar={handleLimparBusca} />
          ) : (
            <div>
              <label className={labelCls}>Código de cadastro</label>
              <input
                readOnly
                value={matricula || (existing ? "" : "Gerado ao salvar")}
                className={`${inputCls} bg-iw-bg text-iw-muted`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <User className="w-4 h-4 text-iw-gold" />
          Dados do professor
        </h3>

        {mostrarBusca && (
          <p className="text-xs text-iw-muted -mt-2">
            {matricula
              ? <>Vinculado ao cadastro de membro — código <strong className="text-iw-navy">{matricula}</strong>.</>
              : "Não encontrou? Preencha a ficha abaixo manualmente — vira um Professor de fora."}
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
            <select value={cargo} onChange={(e) => setCargo(e.target.value)} className={selectCls}>
              <option value="">Sem cargo</option>
              {cargos.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
            </select>
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
            <input
              value={cpf}
              onChange={(e) => { setCpf(maskCPF(e.target.value)); if (cpfError) setCpfError(""); }}
              onBlur={() => checkCpfExists(cpf)}
              placeholder="000.000.000-00"
              className={cpfError ? inputErrCls : inputCls}
            />
            {cpfError && <p className="text-iw-error text-xs mt-1 font-medium">{cpfError}</p>}
          </div>
          <div>
            <label className={labelCls}>RG</label>
            <input value={rg} onChange={(e) => setRg(maskRG(e.target.value))} placeholder="00.000.000-0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Órgão emissor</label>
            <input value={rgOrgaoEmissor} onChange={(e) => setRgOrgaoEmissor(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>UF do RG</label>
            <input value={rgUf} maxLength={2} onChange={(e) => setRgUf(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Data de nascimento</label>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={inputCls} />
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
            <select value={profissao} onChange={(e) => setProfissao(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {profissoes.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <div className="sm:col-span-1 lg:col-span-2">
            <label className={labelCls}>Naturalidade (Cidade / UF)</label>
            <div className="flex gap-2">
              <input
                list="lista-cidades-naturalidade-professor"
                value={naturalidadeCidade}
                onChange={(e) => handleNaturalidadeCidadeChange(e.target.value)}
                placeholder="Digite a cidade..."
                className={`${inputCls} uppercase`}
              />
              <datalist id="lista-cidades-naturalidade-professor">
                {catalogoCidades.map((c) => (
                  <option key={`${c.nome}-${c.uf}`} value={`${c.nome} (${c.uf})`} />
                ))}
              </datalist>
              <select
                value={naturalidadeEstado}
                onChange={(e) => setNaturalidadeEstado(e.target.value)}
                className={`${selectCls} w-24 shrink-0`}
              >
                <option value="">UF</option>
                {states.map((s) => (<option key={s.id} value={s.sigla}>{s.sigla}</option>))}
              </select>
            </div>
            <p className="text-[11px] text-iw-muted mt-1">
              Digite o nome da cidade — a UF é preenchida sozinha ao encontrar na lista.
            </p>
          </div>
          <div>
            <label className={labelCls}>Nacionalidade</label>
            <input value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Cônjuge (se houver)</label>
            <input value={nomeConjuge} onChange={(e) => setNomeConjuge(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Mãe</label>
            <input value={nomeMae} onChange={(e) => setNomeMae(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div>
            <label className={labelCls}>Pai</label>
            <input value={nomePai} onChange={(e) => setNomePai(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
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
              value={cep}
              onChange={(e) => { setCep(e.target.value); if (cepError) setCepError(""); }}
              onBlur={handleBlurCep}
              placeholder={loadingCep ? "Buscando..." : "00000-000"}
              maxLength={9}
              className={cepError ? inputErrCls : inputCls}
            />
            {cepError && <p className="text-iw-error text-xs mt-1 font-medium">{cepError}</p>}
          </div>
          <div className="col-span-12 sm:col-span-7">
            <label className={labelCls}>Endereço</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>Número</label>
            <input value={enderecoNumero} onChange={(e) => setEnderecoNumero(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Complemento</label>
            <input value={enderecoComplemento} onChange={(e) => setEnderecoComplemento(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input value={bairro} onChange={(e) => setBairro(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <label className={labelCls}>Cidade</label>
            <input value={cidade} onChange={(e) => setCidade(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>UF</label>
            <input value={estado} maxLength={2} onChange={(e) => setEstado(e.target.value.toUpperCase())} className={`${inputCls} uppercase`} />
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <ShieldCheck className="w-4 h-4 text-iw-gold" />
          <span className="inline-flex items-center gap-2">
            Acesso ao núcleo de ensino
            {!existing && (
              <span className="text-[10px] font-black uppercase tracking-widest text-black bg-[#CF8403] px-2 py-0.5 rounded-md">
                Obrigatório
              </span>
            )}
          </span>
        </h3>
        <p className="text-xs text-iw-muted -mt-2">
          {existing
            ? "Se preencher o e-mail abaixo, essa pessoa recebe (ou já tem) acesso pra gerenciar sozinha este núcleo — matrículas, turmas e alunos só dele — nível 4, escopado a Campo/Setor/Igreja selecionados acima."
            : "Todo professor novo já sai com acesso próprio pra gerenciar sozinho este núcleo — matrículas, turmas e alunos só dele — nível 4, escopado a Campo/Setor/Igreja selecionados acima. O e-mail informado é o login dele."}
        </p>
        <div className="max-w-sm">
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail de acesso {!existing && "*"}</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="professor@exemplo.com"
            className={inputCls}
            required={!existing}
          />
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
          disabled={isPending || !!cpfError || !!cepError}
          className="flex items-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
