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
//
// 21/09/2026, pedido do Joaquim (achado em teste, imagem 12/13): layout
// padronizado pro mesmo estilo caixa/foco dourado usado em
// nova/NovaMatriculaForm.tsx e [id]/EditarMatriculaForm.tsx — antes esta
// tela usava um padrão de input/label diferente (fora do padrão).
// ============================================================

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Save, Loader2, AlertTriangle, User, Building, Mail, ShieldCheck, FileText, MapPin, Check,
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
  // 21/09/2026, achado em teste: faltava mostrar em algum lugar qual é o
  // e-mail de login do professor -- sem isso a secretaria não tinha como
  // saber com qual e-mail reenviar uma recuperação de senha (ver campo
  // "E-mail de acesso" mais abaixo, que passou a vir pré-preenchido com
  // este valor em vez de sempre em branco).
  email?: string | null;
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
  // Reaproveitamento self-service (completar-cadastro, 20/09/2026): quando
  // o próprio professor preenche a ficha (em vez da secretaria), esconde a
  // seção "Acesso ao núcleo de ensino" (ele já tem login próprio -- essa
  // seção é só pra secretaria conceder acesso a OUTRA pessoa), troca a
  // action padrão (addProfessorAction/updateProfessorAction, staff-only)
  // por uma passada via prop, e substitui a navegação pós-salvar (que por
  // padrão vai pra lista da secretaria) por um callback do chamador.
  selfService?: boolean;
  action?: (formData: FormData) => Promise<{ success: boolean; message?: string }>;
  onSaved?: (message?: string) => void;
}

// ── Estilo padronizado com nova/NovaMatriculaForm.tsx e
// [id]/EditarMatriculaForm.tsx: caixa com destaque dourado ao focar,
// rótulo dentro da própria caixa. ──
const boxCls =
  "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxErrCls =
  "border border-iw-error rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-error focus-within:ring-2 focus-within:ring-iw-error/20 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({
  label, required, span, error, children,
}: {
  label: string; required?: boolean; span?: string; error?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`${error ? boxErrCls : boxCls} ${span ?? "col-span-12 md:col-span-3"}`}>
      <label className={boxLabelCls}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, extra }: { icon: React.ElementType; label: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-iw-border flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-iw-gold" />
        </div>
        <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">{label}</h2>
      </div>
      {extra}
    </div>
  );
}

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
  selfService = false, action, onSaved,
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
  const [email, setEmail] = useState(existing?.email ?? "");
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
    if (!selfService && !existing && (!email.trim() || !email.includes("@"))) {
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
      const res = action
        ? await action(fd)
        : existing
          ? await updateProfessorAction(fd)
          : await addProfessorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      if (onSaved) { onSaved(res.message); return; }
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

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={Building} label="Campo, Setor e Igreja" />

        <div className="grid grid-cols-12 gap-3">
          <Field label="Campo" span="col-span-12 md:col-span-3">
            <select
              value={campoId}
              onChange={(e) => { setCampoId(e.target.value); setSetorId(""); setIgrejaId(""); setAtuaNaSede(false); }}
              className={bareSelectCls}
            >
              <option value="">Selecione o campo...</option>
              {campos.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </Field>

          <Field label="Setor" span="col-span-12 md:col-span-3">
            <select
              value={atuaNaSede ? (sedeDoCampo?.id ?? "") : setorId}
              onChange={(e) => handleSetorChange(e.target.value)}
              disabled={!campoId}
              className={bareSelectCls}
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
          </Field>

          <Field label="Igreja" span="col-span-12 md:col-span-3">
            <select
              value={igrejaId}
              onChange={(e) => setIgrejaId(e.target.value)}
              disabled={!setorId || atuaNaSede}
              className={bareSelectCls}
            >
              <option value="">
                {atuaNaSede ? "SEDE selecionada acima" : setorId ? "Selecione a igreja..." : "Escolha o setor primeiro"}
              </option>
              {igrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
          </Field>

          {mostrarBusca ? (
            <div className="col-span-12 md:col-span-3">
              <BuscaProfessorCompleta onEncontrado={handleMembroEncontrado} onLimpar={handleLimparBusca} />
            </div>
          ) : (
            <Field label="Código de cadastro" span="col-span-12 md:col-span-3">
              <input
                readOnly
                value={matricula || (existing ? "" : "Gerado ao salvar")}
                className={`${bareCls} text-iw-muted`}
              />
            </Field>
          )}
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={User} label="Dados do professor" />

        {mostrarBusca && (
          <p className="text-xs text-iw-muted -mt-1">
            {matricula
              ? <>Vinculado ao cadastro de membro — código <strong className="text-iw-navy">{matricula}</strong>.</>
              : "Não encontrou? Preencha a ficha abaixo manualmente — vira um Professor de fora."}
          </p>
        )}

        <div className="grid grid-cols-12 gap-3">
          <Field label="Nome completo" required span="col-span-12 md:col-span-6">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do professor"
              className={`${bareCls} uppercase`}
              required
            />
          </Field>
          <Field label="Cargo" span="col-span-12 md:col-span-3">
            <select value={cargo} onChange={(e) => setCargo(e.target.value)} className={bareSelectCls}>
              <option value="">Sem cargo</option>
              {cargos.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
            </select>
          </Field>
          <Field label="Telefone" span="col-span-12 md:col-span-3">
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={bareCls}
            />
          </Field>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={FileText} label="Ficha completa" />

        <div className="grid grid-cols-12 gap-3">
          <Field label="CPF" span="col-span-6 md:col-span-3" error={!!cpfError}>
            <input
              value={cpf}
              onChange={(e) => { setCpf(maskCPF(e.target.value)); if (cpfError) setCpfError(""); }}
              onBlur={() => checkCpfExists(cpf)}
              placeholder="000.000.000-00"
              className={bareCls}
            />
            {cpfError && <p className="text-iw-error text-[11px] mt-0.5 font-medium">{cpfError}</p>}
          </Field>
          <Field label="RG" span="col-span-6 md:col-span-3">
            <input value={rg} onChange={(e) => setRg(maskRG(e.target.value))} placeholder="00.000.000-0" className={bareCls} />
          </Field>
          <Field label="Órgão emissor" span="col-span-6 md:col-span-3">
            <input value={rgOrgaoEmissor} onChange={(e) => setRgOrgaoEmissor(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="UF do RG" span="col-span-6 md:col-span-3">
            <input value={rgUf} maxLength={2} onChange={(e) => setRgUf(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Data de nascimento" span="col-span-6 md:col-span-3">
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={bareCls} />
          </Field>
          <Field label="Gênero" span="col-span-6 md:col-span-3">
            <select value={genero} onChange={(e) => setGenero(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {generos.map((g) => (<option key={g.id} value={g.name}>{g.name}</option>))}
            </select>
          </Field>
          <Field label="Estado civil" span="col-span-6 md:col-span-3">
            <select value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {estadosCivis.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </Field>
          <Field label="Escolaridade" span="col-span-6 md:col-span-3">
            <select value={escolaridadeSel} onChange={(e) => setEscolaridadeSel(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {escolaridades.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Profissão" span="col-span-12 md:col-span-3">
            <select value={profissao} onChange={(e) => setProfissao(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {profissoes.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </Field>
          <Field label="Naturalidade — cidade / UF" span="col-span-12 md:col-span-6">
            <div className="flex items-center gap-2">
              <input
                list="lista-cidades-naturalidade-professor"
                value={naturalidadeCidade}
                onChange={(e) => handleNaturalidadeCidadeChange(e.target.value)}
                placeholder="Digite a cidade..."
                className={`${bareCls} uppercase flex-1 min-w-0`}
              />
              <datalist id="lista-cidades-naturalidade-professor">
                {catalogoCidades.map((c) => (
                  <option key={`${c.nome}-${c.uf}`} value={`${c.nome} (${c.uf})`} />
                ))}
              </datalist>
              <select
                value={naturalidadeEstado}
                onChange={(e) => setNaturalidadeEstado(e.target.value)}
                className={`${bareSelectCls} !w-14 flex-none border-l border-iw-border pl-2`}
              >
                <option value="">UF</option>
                {states.map((s) => (<option key={s.id} value={s.sigla}>{s.sigla}</option>))}
              </select>
            </div>
          </Field>
          <Field label="Nacionalidade" span="col-span-12 md:col-span-3">
            <input value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-4">
            <input value={nomeConjuge} onChange={(e) => setNomeConjuge(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Nome da mãe" span="col-span-12 md:col-span-4">
            <input value={nomeMae} onChange={(e) => setNomeMae(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Nome do pai" span="col-span-12 md:col-span-4">
            <input value={nomePai} onChange={(e) => setNomePai(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={MapPin} label="Endereço" />

        <div className="grid grid-cols-12 gap-3">
          <Field label="CEP" span="col-span-6 md:col-span-2" error={!!cepError}>
            <input
              value={cep}
              onChange={(e) => { setCep(e.target.value); if (cepError) setCepError(""); }}
              onBlur={handleBlurCep}
              placeholder={loadingCep ? "Buscando..." : "00000-000"}
              maxLength={9}
              className={bareCls}
            />
            {cepError && <p className="text-iw-error text-[11px] mt-0.5 font-medium">{cepError}</p>}
          </Field>
          <Field label="Endereço" span="col-span-12 md:col-span-7">
            <input value={endereco} onChange={(e) => setEndereco(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Número" span="col-span-6 md:col-span-3">
            <input value={enderecoNumero} onChange={(e) => setEnderecoNumero(e.target.value)} className={bareCls} />
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Complemento" span="col-span-12 md:col-span-4">
            <input value={enderecoComplemento} onChange={(e) => setEnderecoComplemento(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Bairro" span="col-span-12 md:col-span-4">
            <input value={bairro} onChange={(e) => setBairro(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Cidade" span="col-span-6 md:col-span-3">
            <input value={cidade} onChange={(e) => setCidade(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="UF" span="col-span-6 md:col-span-1">
            <input value={estado} maxLength={2} onChange={(e) => setEstado(e.target.value.toUpperCase())} className={`${bareCls} uppercase`} />
          </Field>
        </div>
      </div>

      {!selfService && (
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader
          icon={ShieldCheck}
          label="Acesso ao núcleo de ensino"
          extra={!existing ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-black bg-[#CF8403] px-2 py-0.5 rounded-md">
              Obrigatório
            </span>
          ) : undefined}
        />
        <p className="text-xs text-iw-muted -mt-1">
          {existing
            ? "Se preencher o e-mail abaixo, essa pessoa recebe (ou já tem) acesso pra gerenciar sozinha este núcleo — matrículas, turmas e alunos só dele — nível 4, escopado a Campo/Setor/Igreja selecionados acima."
            : "Todo professor novo já sai com acesso próprio pra gerenciar sozinho este núcleo — matrículas, turmas e alunos só dele — nível 4, escopado a Campo/Setor/Igreja selecionados acima. O e-mail informado é o login dele."}
        </p>
        <div className="grid grid-cols-12 gap-3">
          <Field label="E-mail de acesso" required={!existing} span="col-span-12 md:col-span-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@exemplo.com"
              className={bareCls}
              required={!existing}
            />
          </Field>
        </div>
        {/* 21/09/2026, achado em teste (Joaquim colocou o próprio e-mail
            aqui achando que isso reenviaria uma senha nova pra Lucia
            Helena — na real isso concede/reconfirma acesso de nível 4).
            Aviso explícito pra não repetir a confusão: esqueceu senha não
            se resolve aqui. */}
        {existing && (
          <p className="text-[11px] text-iw-muted bg-iw-bg border border-iw-border rounded-lg px-3 py-2">
            <strong className="text-iw-navy">Esqueceu a senha ou perdeu o acesso?</strong> Não mexa
            aqui — isso concede/atualiza acesso de nível 4, não reenvia senha. Peça pra ele mesmo
            usar &ldquo;Esqueci minha senha&rdquo; na tela de login com o e-mail acima.
          </p>
        )}
        {avisoAcesso && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-iw-success">
            <Check className="w-3.5 h-3.5 shrink-0" /> {avisoAcesso}
          </p>
        )}
      </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        {!selfService && (
        <Link
          href="/dashboard/configuracoes/professores"
          className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          Cancelar
        </Link>
        )}
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
