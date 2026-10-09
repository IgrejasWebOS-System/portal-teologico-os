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
  Plus, Save, Loader2, AlertTriangle, Building, ShieldCheck, FileText, MapPin, Check, Camera, Lock,
} from "lucide-react";
import BuscaProfessorCompleta from "./BuscaProfessorCompleta";
import { addProfessorAction, updateProfessorAction, type MembroCompletoEncontrado } from "../actions";
import { ancestryChain, type UnitNode } from "../unitsChain";
import { createClient } from "@/utils/supabase/client";
import { validarCPF } from "@/utils/cpf";
import { maskPhone } from "@/utils/maskPhone";
import { ESTADOS_BR } from "@/utils/estadosBrasil";
import { useCatalogoCidades, resolverCidadeDigitada } from "@/utils/useCatalogoCidades";

type ChurchLink = { id: string; unit_id: string | null };
type SelectItem = { id: string; name: string };

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
  // 27/09/2026, pedido do Joaquim: foto do professor (bucket "avatars",
  // mesmo padrão de NovoMembroForm/EditarMembroForm/ProfessorNovaMatriculaForm)
  // e observação livre — nenhum dos dois tinha campo na ficha até agora.
  fotoUrl?: string | null;
  observacoes?: string | null;
  // E-mail de login REAL (de auth.users, via admin.auth.admin.getUserById),
  // separado do `email` acima (que é o texto salvo em professores.email e
  // pode estar desatualizado/vazio). Só pra exibição na caixa "Acesso ao
  // núcleo de ensino" quando já existe professor — não é reenviado no save.
  contaEmailAtual?: string | null;
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
// 27/09/2026, pedido do Joaquim: todas as fontes deste formulário em
// preto (antes usavam os tokens iw-navy/iw-muted do design system) — só
// texto normal, cores de estado (erro/sucesso) continuam como estavam.
const boxLabelCls = "block text-[10px] font-extrabold text-black uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-black placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({
  label, required, span, error, labelClassName, children,
}: {
  label: string; required?: boolean; span?: string; error?: boolean; labelClassName?: string; children: React.ReactNode;
}) {
  return (
    <div className={`${error ? boxErrCls : boxCls} ${span ?? "col-span-12 md:col-span-3"}`}>
      <label className={labelClassName ?? boxLabelCls}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

// 27/09/2026, pedido do Joaquim: só o texto da caixa "Acesso ao núcleo de
// ensino" fica 2pt maior — as outras caixas do formulário continuam com o
// tamanho padrão (boxLabelCls), então isto é uma variante local, não uma
// mudança no boxLabelCls compartilhado.
const boxLabelClsMaior = "block text-xs font-extrabold text-black uppercase tracking-wider mb-0.5";

function SectionHeader({ icon: Icon, label, extra }: { icon: React.ElementType; label: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-iw-border flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-iw-gold" />
        </div>
        <h2 className="text-sm font-bold text-black uppercase tracking-wider">{label}</h2>
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
  const [fotoUrl, setFotoUrl] = useState(existing?.fotoUrl ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [observacoes, setObservacoes] = useState(existing?.observacoes ?? "");
  const [error, setError] = useState("");
  const [avisoAcesso, setAvisoAcesso] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [cpfDuplicado, setCpfDuplicado] = useState("");

  // UF ainda entra manualmente (DF, ou quando a cidade não bate no
  // catálogo), mas Naturalidade e Cidade (endereço) buscam por CIDADE
  // primeiro (pedido do Joaquim, 18/09/2026 -- estendido pro endereço
  // residencial em 26/09/2026, auditoria de padronização de fichas):
  // catálogo compartilhado (`useCatalogoCidades`) com a lista nacional de
  // municípios (IBGE) + regiões administrativas do DF
  // (settings_custom_regions). Ao digitar/escolher a cidade no datalist,
  // a UF é preenchida sozinha.
  const { catalogoCidades } = useCatalogoCidades();

  // Ao digitar/escolher no datalist, se o texto bater "Nome (UF)" com uma
  // cidade do catálogo, preenche a UF sozinha; senão deixa como o usuário
  // digitou (nome livre) e a UF continua editável manualmente.
  const handleNaturalidadeCidadeChange = (valorDigitado: string) => {
    const { cidade, uf } = resolverCidadeDigitada(valorDigitado, catalogoCidades);
    setNaturalidadeCidade(cidade);
    if (uf) setNaturalidadeEstado(uf);
  };

  // 26/09/2026, pedido do Joaquim (auditoria de padronização de fichas):
  // mesmo tratamento pro campo "Cidade" do endereço residencial -- antes
  // era input livre, sem catálogo, diferente do campo de Naturalidade.
  const handleCidadeChange = (valorDigitado: string) => {
    const { cidade, uf } = resolverCidadeDigitada(valorDigitado, catalogoCidades);
    setCidade(cidade);
    if (uf) setEstado(uf);
  };

  // 27/09/2026, pedido do Joaquim: mesmo padrão de upload já usado em
  // NovoMembroForm/EditarMembroForm/ProfessorNovaMatriculaForm (bucket
  // "avatars") — a ficha do professor nunca teve esse campo.
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `professor-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setFotoUrl(data.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      alert(`Erro no upload da foto: ${msg}`);
    } finally {
      setUploadingFoto(false);
    }
  };

  // 05/10/2026: o erro de CPF ficava preso depois de corrigir o número (ou de
  // preencher o CPF pela busca de membro), porque só era recalculado ao sair
  // do campo. Agora é recalculado a cada mudança do CPF; `cancelado` impede
  // que uma consulta antiga sobrescreva o resultado do CPF atual.
  // Validação de formato é derivada (sem estado); só a checagem de duplicidade
  // (consulta ao banco) guarda estado — o CPF encontrado como duplicado.
  const cpfFormatoErro = useMemo(() => {
    const digitos = cpf.replace(/\D/g, "");
    if (digitos.length < 11) return "";
    return validarCPF(cpf) ? "" : "CPF inválido — confira os números digitados.";
  }, [cpf]);
  const cpfPronto = cpf.replace(/\D/g, "").length >= 11 && !cpfFormatoErro;

  useEffect(() => {
    if (!cpfPronto) return;
    let cancelado = false;
    (async () => {
      const supabase = createClient();
      let query = supabase.from("professores").select("id").eq("cpf", cpf);
      if (existing?.id) query = query.neq("id", existing.id);
      const { data } = await query.maybeSingle();
      if (!cancelado) setCpfDuplicado(data ? cpf : "");
    })();
    return () => { cancelado = true; };
  }, [cpf, cpfPronto, existing?.id]);

  const cpfError =
    cpfFormatoErro || (cpfPronto && cpfDuplicado === cpf ? "Este CPF já está cadastrado para outro professor." : "");

  const campos = useMemo(() => units.filter((u) => u.type === "CAMPO"), [units]);
  const sedeDoCampo = useMemo(() => units.find((u) => u.type === "SEDE" && u.parent_id === campoId), [units, campoId]);
  // 28/09/2026, achado do Joaquim: faltava ordenar esta lista — sem
  // `.sort()`, os setores/regionais vinham na ordem crua da query (sem
  // ORDER BY), então "REGIONAL 001" podia cair fora de sequência e parecer
  // "sumido" ao rolar o dropdown numericamente. Mesmo padrão de
  // localeCompare já usado em TurmasDoProfessor.tsx/SeletorHierarquico.
  const setores = useMemo(
    () =>
      (sedeDoCampo ? units.filter((u) => u.type === "SETOR" && u.parent_id === sedeDoCampo.id) : []).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      ),
    [units, sedeDoCampo]
  );
  const igrejas = useMemo(
    () =>
      (setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      ),
    [units, setorId]
  );

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
    // 28/09/2026, achado do Joaquim: a badge "De fora" da lista não pode
    // depender de member_id (isso só diz se a busca achou um match) — tem
    // que refletir a ROTA de cadastro. `mostrarBusca=false` só acontece de
    // verdade em /novo/externo (na edição também vem false, mas
    // updateProfessorAction ignora este campo, então não tem risco de
    // reclassificar um professor existente ao editar).
    fd.set("veio_de_fora", !existing && !mostrarBusca ? "true" : "false");
    fd.set("unit_id", finalUnitId);
    fd.set("setor_unit_id", setorId);
    // 27/09/2026, pedido do Joaquim: "Acesso ao núcleo de ensino" virou
    // bloqueado por enquanto pra professor já existente — o campo de
    // e-mail não é mais editável ali, então não reenvia (evita disparar
    // grantNucleoAccess de novo a cada "Salvar alterações"). Continua
    // obrigatório e enviado normalmente só no cadastro de um professor novo.
    if (!existing) fd.set("email", email.trim());
    fd.set("foto_url", fotoUrl);
    fd.set("observacoes", observacoes);
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
        {/* 27/09/2026, pedido do Joaquim: "Campo, Setor e Igreja" e "Dados
            do professor" viraram uma caixa só ("Dados gerais professor"),
            com a busca por matrícula/CPF/nome na mesma linha do título, à
            direita (antes ficava dentro do grid de Campo/Setor/Igreja). */}
        <SectionHeader
          icon={Building}
          label="Dados gerais professor"
          extra={mostrarBusca ? (
            <BuscaProfessorCompleta onEncontrado={handleMembroEncontrado} onLimpar={handleLimparBusca} />
          ) : undefined}
        />

        <div className="grid grid-cols-12 gap-4 items-center">
          {/* 27/09/2026, pedido do Joaquim: o texto "Vinculado ao cadastro
              de membro" saiu daqui de baixo da foto — agora fica embaixo da
              caixa "Nome completo", mas FORA da caixa (ver mais abaixo).
              Coluna da foto ficou só com a foto mesmo, e as duas colunas
              (foto e campos) ficam centralizadas uma com a outra. */}
          <div className="col-span-12 md:col-span-2 flex flex-col items-start justify-start gap-2">
            <div className="w-full aspect-square rounded-full bg-transparent border-[1.5px] border-[#E88D0C]/40 flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt="Foto do professor" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-black group-hover:text-iw-navy">
                  {uploadingFoto ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
                  <span className="text-[10px] font-semibold uppercase text-center px-2">Foto</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          <div className="col-span-12 md:col-span-10 space-y-3">
            {/* 27/09/2026, pedido do Joaquim: "Campo/Setor/Igreja" e "Código
                de cadastro" (esse último só aparece quando mostrarBusca=false,
                ex.: tela de editar) precisam caber todos na MESMA linha —
                antes eram 4 caixas de col-span-4 (16/12, quebrava linha).
                Com busca visível (3 caixas) mantém col-span-4; sem busca
                (4 caixas) usa col-span-3 pra caber certinho em 12. */}
            <div className="grid grid-cols-12 gap-3">
              <Field label="Campo" span={mostrarBusca ? "col-span-12 md:col-span-4" : "col-span-12 md:col-span-3"}>
                <select
                  value={campoId}
                  onChange={(e) => { setCampoId(e.target.value); setSetorId(""); setIgrejaId(""); setAtuaNaSede(false); }}
                  className={bareSelectCls}
                >
                  <option value="">Selecione o campo...</option>
                  {campos.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </Field>

              <Field label="Setor" span={mostrarBusca ? "col-span-12 md:col-span-4" : "col-span-12 md:col-span-3"}>
                <select
                  value={atuaNaSede ? (sedeDoCampo?.id ?? "") : setorId}
                  onChange={(e) => handleSetorChange(e.target.value)}
                  disabled={!campoId}
                  className={bareSelectCls}
                >
                  <option value="">{campoId ? "Selecione o setor..." : "Escolha o campo primeiro"}</option>
                  {sedeDoCampo && <option value={sedeDoCampo.id}>SEDE — {sedeDoCampo.name}</option>}
                  {/* Só "REGIONAL NNN"/"SETOR NNN" entram nos grupos -- linhas
                      de unidade mal cadastradas (ex.: nome "001" sem o
                      prefixo, sem nenhum vínculo hoje) ficam de fora em vez de
                      aparecer soltas no fim da lista. */}
                  <optgroup label="Setor">
                    {setores
                      .filter((s) => /^SETOR\s+\d+/i.test(s.name))
                      .map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </optgroup>
                  <optgroup label="Regional">
                    {setores
                      .filter((s) => /^REGIONAL\s+\d+/i.test(s.name))
                      .map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </optgroup>
                </select>
              </Field>

              <Field label="Igreja" span={mostrarBusca ? "col-span-12 md:col-span-4" : "col-span-12 md:col-span-3"}>
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

              {!mostrarBusca && (
                <Field label="Código de cadastro" span="col-span-12 md:col-span-3">
                  <input
                    readOnly
                    value={matricula || (existing ? "" : "Gerado ao salvar")}
                    className={`${bareCls} text-black`}
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 md:col-span-6">
                <Field label="Nome completo" required span="w-full">
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value.toUpperCase())}
                    placeholder="Nome do professor"
                    className={`${bareCls} uppercase`}
                    required
                  />
                </Field>
                {/* 27/09/2026, pedido do Joaquim: este aviso saiu de dentro
                    da caixa de Nome completo -- fica embaixo dela, fora da
                    borda, não mais junto com o texto "matrícula/CPF ou
                    nome". Aparece sempre que houver matrícula vinculada,
                    independente da busca estar visível ou não (na tela de
                    edição a busca some, mas este aviso continua). */}
                {matricula ? (
                  <p className="mt-1.5 text-xs text-black">
                    Vinculado ao cadastro de membro — código <strong className="text-black">{matricula}</strong>.
                  </p>
                ) : mostrarBusca ? (
                  <p className="mt-1.5 text-xs text-black">
                    Não encontrou? Preencha a ficha abaixo manualmente — vira um Professor de fora.
                  </p>
                ) : null}
              </div>
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
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={FileText} label="Ficha completa" />

        <div className="grid grid-cols-12 gap-3">
          <Field label="CPF" span="col-span-6 md:col-span-3" error={!!cpfError}>
            <input
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
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
                {ESTADOS_BR.map((s) => (<option key={s.uf} value={s.uf}>{s.uf}</option>))}
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
            <input
              list="lista-cidades-endereco-professor"
              value={cidade}
              onChange={(e) => handleCidadeChange(e.target.value)}
              className={`${bareCls} uppercase`}
            />
            <datalist id="lista-cidades-endereco-professor">
              {catalogoCidades.map((c) => (
                <option key={`${c.nome}-${c.uf}`} value={`${c.nome} (${c.uf})`} />
              ))}
            </datalist>
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
            <span className="text-xs font-black uppercase tracking-widest text-black bg-[#CF8403] px-2 py-0.5 rounded-md">
              Obrigatório
            </span>
          ) : undefined}
        />
        <p className="text-sm text-black -mt-1">
          {existing
            ? "Este professor acessa a Área do Professor (/professor), restrita às próprias turmas, alunos e matrículas do núcleo selecionado acima. Concessão de acesso fica bloqueada por aqui por enquanto."
            : "Todo professor novo recebe um convite por e-mail para criar a senha e acessar a Área do Professor (/professor), onde gerencia só as próprias turmas, alunos e matrículas do núcleo selecionado acima (Campo/Setor/Igreja). O e-mail informado é o login dele. Professor não acessa o painel administrativo."}
        </p>

        {existing ? (
          <>
            {/* 27/09/2026, pedido do Joaquim: campo deixou de ser editável
                aqui (evita reenviar/reconceder acesso sem querer a cada
                "Salvar alterações") — agora só mostra o e-mail de login
                real (auth.users), como aviso, com um cadeado. Caixa menor
                que antes, de propósito. */}
            <div className="grid grid-cols-12 gap-3">
              <Field label="E-mail de acesso atual (bloqueado)" span="col-span-12 md:col-span-3" labelClassName={boxLabelClsMaior}>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-black/50 shrink-0" />
                  <input
                    type="email"
                    value={existing.contaEmailAtual ?? email ?? ""}
                    readOnly
                    disabled
                    placeholder="Sem acesso concedido ainda"
                    className={`${bareCls} text-black/70 cursor-not-allowed`}
                  />
                </div>
              </Field>
            </div>
            <p className="text-sm text-black bg-iw-bg border border-iw-border rounded-lg px-3 py-2">
              <strong className="text-black">Esqueceu a senha ou perdeu o acesso?</strong> Não mexe
              aqui — isso concedia/atualizava acesso de nível 4, não reenvia senha. Peça pra ele mesmo
              usar &ldquo;Esqueci minha senha&rdquo; na tela de login com o e-mail acima.
            </p>
          </>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            <Field label="E-mail de acesso" required span="col-span-12 md:col-span-4" labelClassName={boxLabelClsMaior}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@exemplo.com"
                className={bareCls}
                required
              />
            </Field>
          </div>
        )}

        {/* 27/09/2026, pedido do Joaquim: local pra observação livre,
            dentro desta mesma caixa. */}
        <div className="grid grid-cols-12 gap-3">
          <Field label="Observação" span="col-span-12" labelClassName={boxLabelClsMaior}>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações internas sobre este professor..."
              rows={2}
              className={`${bareCls} resize-y`}
            />
          </Field>
        </div>

        {avisoAcesso && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-iw-success">
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
