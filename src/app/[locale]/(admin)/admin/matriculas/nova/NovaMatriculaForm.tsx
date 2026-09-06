"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Send, Loader2, AlertTriangle, User, MapPin, GraduationCap, Wallet, Plus, X, ShieldCheck, Camera, Search, Check,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { validarCPF } from "@/utils/cpf";
import PageHeader from "@/components/layout/PageHeader";
import { matricularDiretoAction, addTurmaAction } from "../actions";
import MatriculaLookup from "@/app/[locale]/(igreja)/dashboard/configuracoes/MatriculaLookup";
import { addProfessorAction, type MembroEncontrado } from "@/app/[locale]/(igreja)/dashboard/configuracoes/actions";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type Curso = { id: string; title: string; module: string };
type SelectItem = { id: string; name: string };
type Church = { id: string; name: string; sector_id: string | null };
type Turma = { id: string; nome: string; course_id: string };
type Professor = { id: string; nome_completo: string; church_id: string | null };
type Municipio = { nome: string; uf: string };
type Preco = {
  course_id: string;
  valor_matricula_centavos: number;
  valor_parcela_centavos: number;
  numero_parcelas: number;
};

// Preços dos cursos (Financeiro > Preços dos Cursos) chegam em centavos —
// converte pra string "25,00" pronta pra cair num input de texto mascarado.
function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// Caminho inverso — texto digitado ("25,00", "25.00", "25") vira centavos,
// pra somar matrícula + parcelas e mostrar o total antes de submeter
// (validação visual pedida pela secretaria).
function textoParaCentavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

// Amostragem grande da data por extenso ("12 de mai. de 1967"), atualizando
// conforme a pessoa digita.
function dataPorExtenso(br: string): string {
  if (br.length !== 10) return "";
  const [d, m, y] = br.split("/");
  const dia = Number(d), mes = Number(m), ano = Number(y);
  if (!dia || !mes || !ano) return "";
  const data = new Date(ano, mes - 1, dia);
  if (data.getDate() !== dia || data.getMonth() !== mes - 1) return "";
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

// ── Campo compacto: rótulo em caixa alta dentro da própria caixa ──
// O destaque forte (borda + fundo dourados) segue o campo com foco — ou
// seja, o PRÓXIMO campo a preencher — via :focus-within, aplicado pelo
// navegador sozinho assim que o campo recebe foco. Campo já preenchido,
// sem foco, fica neutro e ganha só um ícone de check (ver Field).
const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
// Variante compacta — usada no card "Curso e Vínculo" desde que ele ficou
// mais estreito (foi pro lado direito, dividindo espaço com a foto do aluno).
const boxClsCompact =
  "border border-iw-border rounded-lg px-2.5 pt-1 pb-1.5 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;
const boxFilledCls =
  "border border-iw-gold/40 rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxClsCompactFilled =
  "border border-iw-gold/40 rounded-lg px-2.5 pt-1 pb-1.5 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";

// Depois que a pessoa escolhe uma opção (select nativo ou item da lista em
// tela cheia), pula sozinho pro próximo campo preenchível do formulário.
function focarProximoCampo(atual: HTMLElement) {
  const form = atual.closest("form");
  if (!form) return;
  // A busca pelo "próximo campo" só pode rodar DEPOIS que a tela cheia de
  // busca já tiver saído do ar — ver comentário equivalente em
  // ConfirmarCadastroForm.tsx.
  setTimeout(() => {
    const focaveis = Array.from(
      form.querySelectorAll<HTMLElement>("input, select, textarea, button")
    ).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.tabIndex === -1) return false;
      if ((el as HTMLInputElement).type === "hidden") return false;
      if (el.offsetParent === null) return false;
      return true;
    });
    const idx = focaveis.indexOf(atual);
    if (idx > -1 && idx < focaveis.length - 1) {
      focaveis[idx + 1]?.focus();
    }
  }, 30);
}

function Field({
  label, required, span, className, compact, filled, children,
}: {
  label: string; required?: boolean; span?: string; className?: string; compact?: boolean; filled?: boolean; children: React.ReactNode;
}) {
  const base = filled ? (compact ? boxClsCompactFilled : boxFilledCls) : (compact ? boxClsCompact : boxCls);
  return (
    <div className={`${base} ${span ?? "col-span-12 md:col-span-3"} ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-1">
        <label className={boxLabelCls}>{label}{required && " *"}</label>
        {filled && <Check className="w-3 h-3 text-iw-gold shrink-0" aria-hidden="true" />}
      </div>
      {children}
    </div>
  );
}

interface ItemSelecao {
  id: string;
  label: string;
  sublabel?: string;
}

// Dropdown de busca ancorado sob o campo — usado na tela de secretaria
// (desktop). Uma versão em tela cheia (SeletorBuscaTelaCheia) existe à
// parte pro formulário do próprio aluno no celular (confirmar-cadastro),
// onde a lista ficaria escondida atrás do teclado; aqui, num monitor
// normal, tela cheia só tampava a tela toda sem necessidade — daí o
// dropdown compacto, igual um combobox comum.
function SeletorBuscaDropdown({
  titulo, valorInicial, itens, onFechar, onSelecionar, placeholder, permitirLivre,
}: {
  titulo: string;
  valorInicial: string;
  itens: ItemSelecao[];
  onFechar: () => void;
  onSelecionar: (item: ItemSelecao) => void;
  placeholder?: string;
  permitirLivre?: boolean;
}) {
  const [busca, setBusca] = useState(valorInicial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens.slice(0, 50);
    return itens.filter((i) => i.label.toLowerCase().startsWith(q)).slice(0, 50);
  }, [busca, itens]);

  return (
    <>
      {/* Camada invisível atrás do dropdown — clicar fora fecha, sem
          escurecer/tampar o resto da tela como um modal faria. */}
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-iw-border rounded-xl shadow-lg flex flex-col max-h-80 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-iw-border shrink-0">
          <Search className="w-3.5 h-3.5 text-iw-muted shrink-0" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder ?? `Buscar ${titulo.toLowerCase()}...`}
            autoComplete="off"
            className="flex-1 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none py-1 bg-transparent"
          />
        </div>

        <ul className="flex-1 overflow-auto">
          {resultados.length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-iw-muted">
              Nenhum resultado encontrado{permitirLivre ? " — pode usar o botão abaixo" : ""}.
            </li>
          )}
          {resultados.map((item) => (
            <li key={item.id} className="border-b border-iw-border/60 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelecionar(item)}
                className="w-full text-left px-3 py-2 text-sm text-iw-navy hover:bg-iw-bg active:bg-iw-gold/10"
              >
                {item.label}
                {item.sublabel && <span className="text-iw-muted text-xs"> — {item.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>

        {permitirLivre && busca.trim().length > 0 && (
          <div className="p-2 border-t border-iw-border shrink-0">
            <button
              type="button"
              onClick={() => onSelecionar({ id: busca.trim(), label: busca.trim() })}
              className="w-full text-center text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 px-3 py-2 rounded-lg transition-colors"
            >
              Usar &ldquo;{busca.trim()}&rdquo; mesmo assim
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Campo "de escolha" — mostra um botão/campo somente-leitura que abre o
// SeletorBuscaDropdown ao clicar, com busca.
function CampoDeEscolha({
  label, name, span, itens, placeholder, required, permitirLivre,
}: {
  label: string;
  name: string;
  span?: string;
  itens: ItemSelecao[];
  placeholder?: string;
  required?: boolean;
  permitirLivre?: boolean;
}) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Field label={label} required={required} span={span} className="relative" filled={valor.length > 0}>
      <input
        ref={inputRef}
        name={name}
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder={placeholder}
        className={`${bareCls} cursor-pointer`}
      />
      {aberto && (
        <SeletorBuscaDropdown
          titulo={label}
          valorInicial={valor}
          itens={itens}
          permitirLivre={permitirLivre}
          placeholder={placeholder}
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            setValor(item.label);
            setAberto(false);
            if (inputRef.current) focarProximoCampo(inputRef.current);
          }}
        />
      )}
    </Field>
  );
}

// Naturalidade — igual ao CampoDeEscolha, mas ao escolher uma cidade também
// define a UF correspondente.
function CampoNaturalidade({
  span, municipios, onSelecionarCidade,
}: {
  span?: string;
  municipios: Municipio[];
  onSelecionarCidade: (nome: string, uf: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const itens = useMemo(
    () => municipios.map((m, i) => ({ id: `${m.nome}|${m.uf}|${i}`, label: m.nome, sublabel: m.uf })),
    [municipios]
  );

  return (
    <Field label="Naturalidade — cidade" span={span} className="relative" filled={valor.length > 0}>
      <input
        ref={inputRef}
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder="Cidade de nascimento"
        className={`${bareCls} cursor-pointer`}
      />
      {aberto && (
        <SeletorBuscaDropdown
          titulo="Naturalidade"
          valorInicial={valor}
          itens={itens}
          permitirLivre
          placeholder="Cidade de nascimento"
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            const [nome, uf] = item.id.includes("|") ? item.id.split("|") : [item.label, ""];
            setValor(nome);
            onSelecionarCidade(nome, uf);
            setAberto(false);
            if (inputRef.current) focarProximoCampo(inputRef.current);
          }}
        />
      )}
    </Field>
  );
}

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
      className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity border border-black"
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
  churches,
  setores,
  turmasIniciais,
  professoresIniciais,
  precos,
  errorMsg,
}: {
  campos: CampoMinisterio[];
  cursos: Curso[];
  churches: Church[];
  setores: SelectItem[];
  turmasIniciais: Turma[];
  professoresIniciais: Professor[];
  precos: Preco[];
  errorMsg?: string;
}) {
  const [responsavelPagamento, setResponsavelPagamento] = useState("ALUNO");
  const [formaCobranca, setFormaCobranca] = useState("MANUAL");
  // Preenchidos automaticamente ao escolher o curso (a partir de Financeiro
  // > Preços dos Cursos) — a secretaria pode sobrescrever pontualmente sem
  // afetar o preço padrão guardado lá.
  const [valorMatricula, setValorMatricula] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [numeroParcelasPagto, setNumeroParcelasPagto] = useState("12");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
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
  const [naturalidadeCidade, setNaturalidadeCidade] = useState("");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [genero, setGenero] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [escolaridadeSel, setEscolaridadeSel] = useState("");

  const [generos, setGeneros] = useState<SelectItem[]>([]);
  const [estadosCivis, setEstadosCivis] = useState<SelectItem[]>([]);
  const [escolaridades, setEscolaridades] = useState<SelectItem[]>([]);
  const [profissoes, setProfissoes] = useState<SelectItem[]>([]);

  // Curso e vínculo
  const [courseId, setCourseId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>(turmasIniciais);
  const [turmaId, setTurmaId] = useState("");
  const [professores, setProfessores] = useState<Professor[]>(professoresIniciais);
  const [professorId, setProfessorId] = useState("");

  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [novaTurmaInicio, setNovaTurmaInicio] = useState("");
  const [novaTurmaFim, setNovaTurmaFim] = useState("");
  const [showNovoProfessor, setShowNovoProfessor] = useState(false);
  const [novoProfNome, setNovoProfNome] = useState("");
  const [novoProfCargo, setNovoProfCargo] = useState("");
  const [novoProfTelefone, setNovoProfTelefone] = useState("");
  const [novoProfMemberId, setNovoProfMemberId] = useState("");
  const [isPendingExtra, startTransitionExtra] = useTransition();
  const [extraError, setExtraError] = useState("");

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

  useEffect(() => {
    async function fetchMunicipios() {
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios");
        const data = await res.json();
        const lista: Municipio[] = (data as unknown[]).map((m) => {
          const item = m as {
            nome: string;
            microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
            "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } };
          };
          const uf =
            item.microrregiao?.mesorregiao?.UF?.sigla ??
            item["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ??
            "";
          return { nome: item.nome, uf };
        });
        setMunicipios(lista);
      } catch {
        // silencioso — o campo continua utilizável como texto livre
      }
    }
    fetchMunicipios();
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

  // Total calculado ao vivo (matrícula + parcela x nº de parcelas) —
  // validação visual pedida pela secretaria antes de gerar a matrícula.
  const valorTotalPagtoCentavos = useMemo(() => {
    const matriculaCentavos = textoParaCentavos(valorMatricula);
    const parcelaCentavos = textoParaCentavos(valorParcela);
    const numParcelas = Math.max(1, Number(numeroParcelasPagto) || 1);
    return matriculaCentavos + parcelaCentavos * numParcelas;
  }, [valorMatricula, valorParcela, numeroParcelasPagto]);

  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );
  const turmasDoCurso = useMemo(
    () => (courseId ? turmas.filter((t) => t.course_id === courseId) : []),
    [courseId, turmas]
  );

  const handleCriarTurma = () => {
    if (!courseId) { setExtraError("Selecione o curso antes de criar a turma."); return; }
    if (!novaTurmaNome.trim()) { setExtraError("Digite o nome da turma."); return; }
    if (novaTurmaInicio && novaTurmaFim && novaTurmaFim < novaTurmaInicio) {
      setExtraError("O mês/ano de término não pode ser antes do início.");
      return;
    }
    setExtraError("");
    const fd = new FormData();
    fd.set("course_id", courseId);
    fd.set("nome", novaTurmaNome.trim());
    fd.set("data_inicio", novaTurmaInicio);
    fd.set("data_fim", novaTurmaFim);
    startTransitionExtra(async () => {
      const res = await addTurmaAction(fd);
      if (!res.success || !res.data) { setExtraError(res.message ?? "Erro ao criar turma."); return; }
      const nova = { id: res.data.id as string, nome: res.data.nome as string, course_id: courseId };
      setTurmas((prev) => [...prev, nova]);
      setTurmaId(nova.id);
      setShowNovaTurma(false);
      setNovaTurmaNome(""); setNovaTurmaInicio(""); setNovaTurmaFim("");
    });
  };

  // ── Upload da foto do aluno — mesmo bucket "avatars" usado no
  // cadastro de membros (dashboard/membros/novo). ──
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `aluno-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setFotoUrl(data.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      setExtraError(`Erro no upload da foto: ${msg}`);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleCriarProfessor = () => {
    if (!novoProfNome.trim()) { setExtraError("Digite o nome do professor(a)."); return; }
    setExtraError("");
    const fd = new FormData();
    fd.set("nome_completo", novoProfNome.trim());
    fd.set("cargo", novoProfCargo);
    fd.set("telefone", novoProfTelefone);
    fd.set("member_id", novoProfMemberId);
    fd.set("sector_id", sectorId);
    fd.set("church_id", churchId);
    startTransitionExtra(async () => {
      const res = await addProfessorAction(fd);
      if (!res.success || !res.data) { setExtraError(res.message ?? "Erro ao criar professor(a)."); return; }
      const criado = res.data as Professor;
      setProfessores((prev) => [...prev, criado]);
      setProfessorId(criado.id);
      setShowNovoProfessor(false);
      setNovoProfNome(""); setNovoProfCargo(""); setNovoProfTelefone(""); setNovoProfMemberId("");
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-16 px-2">
      <PageHeader
        title="Nova Matrícula Direta"
        description="Cadastro completo do aluno + matrícula gerada na hora, sem passar pela inscrição pública nem pelo pagamento online."
        backHref="/admin/matriculas"
        backLabel="Voltar para Matrículas"
      />

      {/* Wrapper sempre montado — evita que o <form> logo abaixo remonte (e
          perca todos os campos não controlados já preenchidos) quando esses
          banners de erro aparecem/somem, por causa da reconciliação do React
          numa lista de irmãos sem key. */}
      <div className="space-y-3 empty:hidden">
        {errorMsg && (
          <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
        {extraError && (
          <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{extraError}</span>
          </div>
        )}
      </div>

      <form
        action={(fd: FormData) => {
          if (!validarCPF(cpf)) {
            setExtraError("CPF inválido — confira os dígitos digitados.");
            return;
          }
          setExtraError("");
          fd.set("cpf", cpf);
          fd.set("rg", rg);
          fd.set("telefone", telefone);
          fd.set("data_nascimento", dateBrToIso(dataNascimento));
          fd.set("cep", cep);
          fd.set("endereco", endereco);
          fd.set("bairro", bairro);
          fd.set("cidade", cidade);
          fd.set("estado", estado);
          fd.set("sector_id", sectorId);
          fd.set("church_id_aluno", churchId);
          fd.set("course_edition_id", turmaId);
          fd.set("professor_id", professorId);
          // A action lê "campo_ministerio_nome" além do id (pro PDF/telas
          // que só mostram o nome) — sem isso, o nome ficava sempre em
          // branco mesmo com o campo selecionado.
          const campoMinisterioIdSelecionado = fd.get("campo_ministerio_id") as string;
          const campoSelecionado = campos.find((c) => c.id === campoMinisterioIdSelecionado);
          fd.set("campo_ministerio_nome", campoSelecionado?.nome ?? "");
          fd.set("naturalidade_cidade", naturalidadeCidade);
          fd.set("naturalidade_estado", naturalidadeEstado);
          fd.set("foto_url", fotoUrl);
          return matricularDiretoAction(fd);
        }}
        className="space-y-6"
      >
        {/* Foto do aluno + Curso e vínculo — foto à esquerda, quadro à direita */}
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Foto do aluno — só o espaço de inserção, sem card/fundo ao redor */}
          <div className="col-span-12 md:col-span-2 flex flex-col items-start justify-start gap-2">
            <div className="w-full aspect-square rounded-full bg-transparent border-[1.5px] border-[#E88D0C]/40 flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt="Foto do aluno" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-iw-muted group-hover:text-iw-blue">
                  {uploadingFoto ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Camera className="w-7 h-7" />
                  )}
                  <span className="text-[10px] font-semibold uppercase text-center px-2">Foto do aluno</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <input type="hidden" name="foto_url" value={fotoUrl} />
          </div>

          {/* Curso e vínculo */}
          <div className="col-span-12 md:col-span-10 bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
            <SectionHeader icon={GraduationCap} label="Curso e Vínculo" />
            <div className="grid grid-cols-12 gap-2.5">
              <Field compact label="Curso" required span="col-span-12 md:col-span-4">
                <select
                  name="course_id"
                  required
                  value={courseId}
                  onChange={(e) => {
                    const novoCursoId = e.target.value;
                    setCourseId(novoCursoId);
                    setTurmaId("");
                    // Preço fixo do curso (Financeiro > Preços dos Cursos) —
                    // preenche sozinho a seção de Pagamento mais abaixo.
                    const preco = precos.find((p) => p.course_id === novoCursoId);
                    setValorMatricula(preco ? centavosParaTexto(preco.valor_matricula_centavos) : "");
                    setValorParcela(preco ? centavosParaTexto(preco.valor_parcela_centavos) : "");
                    setNumeroParcelasPagto(preco ? String(preco.numero_parcelas) : "12");
                  }}
                  className={bareSelectCls}
                >
                  <option value="" disabled>Selecione o curso</option>
                  {cursosEscola.length > 0 && (
                    <optgroup label="Escola Teológica">
                      {cursosEscola.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </optgroup>
                  )}
                  {cursosOutros.length > 0 && (
                    <optgroup label="Cursos & Preparatórios">
                      {cursosOutros.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </Field>

              <Field compact label="Campo / Ministério" span="col-span-12 md:col-span-4">
                <select name="campo_ministerio_id" className={bareSelectCls} defaultValue="">
                  <option value="">Selecione (opcional)</option>
                  {campos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </Field>

              <Field compact label="Setor" span="col-span-6 md:col-span-2">
                <select
                  value={sectorId}
                  onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
                  className={bareSelectCls}
                >
                  <option value="">Selecione...</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field compact label="Igreja" span="col-span-6 md:col-span-2">
                <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={bareSelectCls}>
                  <option value="">Selecione...</option>
                  {igrejasDoSetor.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-12 gap-2.5 items-start">
              <div className="col-span-12 md:col-span-6 grid grid-cols-[1fr_auto] gap-2">
                <Field compact label="Turma" span="">
                  <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={bareSelectCls}>
                    <option value="">
                      {courseId ? "Selecione..." : "Selecione o curso primeiro"}
                    </option>
                    {turmasDoCurso.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => setShowNovaTurma((v) => !v)}
                  className="shrink-0 h-full px-3 border border-iw-border rounded-lg bg-white hover:bg-iw-bg text-xs font-bold text-iw-navy flex items-center gap-1 transition-colors"
                >
                  {showNovaTurma ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Turma
                </button>
              </div>

              <div className="col-span-12 md:col-span-6 grid grid-cols-[1fr_auto] gap-2">
                <Field compact label="Professor(a)" span="">
                  <select value={professorId} onChange={(e) => setProfessorId(e.target.value)} className={bareSelectCls}>
                    <option value="">Selecione...</option>
                    {professores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome_completo}</option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => setShowNovoProfessor((v) => !v)}
                  className="shrink-0 h-full px-3 border border-iw-border rounded-lg bg-white hover:bg-iw-bg text-xs font-bold text-iw-navy flex items-center gap-1 transition-colors"
                >
                  {showNovoProfessor ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Professor(a)
                </button>
              </div>
            </div>

            {showNovaTurma && (
              <div className="bg-iw-bg rounded-xl p-3 grid grid-cols-12 gap-2.5 items-end">
                <Field compact label="Nome da turma" span="col-span-12 md:col-span-4">
                  <input
                    value={novaTurmaNome}
                    onChange={(e) => setNovaTurmaNome(e.target.value)}
                    placeholder="Ex: Edição 2026"
                    className={bareCls}
                  />
                </Field>
                <Field compact label="Mês/Ano — Início" span="col-span-6 md:col-span-3">
                  <input
                    type="month"
                    value={novaTurmaInicio}
                    onChange={(e) => setNovaTurmaInicio(e.target.value)}
                    className={bareCls}
                  />
                </Field>
                <Field compact label="Mês/Ano — Término" span="col-span-6 md:col-span-3">
                  <input
                    type="month"
                    value={novaTurmaFim}
                    onChange={(e) => setNovaTurmaFim(e.target.value)}
                    className={bareCls}
                  />
                </Field>
                <button
                  type="button"
                  onClick={handleCriarTurma}
                  disabled={isPendingExtra}
                  className="col-span-12 md:col-span-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
                >
                  Salvar turma
                </button>
              </div>
            )}

            {showNovoProfessor && (
              <div className="bg-iw-bg rounded-xl p-3 grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-12 md:col-span-3">
                  <MatriculaLookup
                    label="Matrícula"
                    onFound={(m: MembroEncontrado) => {
                      setNovoProfMemberId(m.id);
                      setNovoProfNome(m.full_name);
                      setNovoProfCargo(m.cargo ?? "");
                      setNovoProfTelefone(m.phone ?? "");
                    }}
                    onClear={() => setNovoProfMemberId("")}
                  />
                </div>
                <Field compact label="Nome completo" span="col-span-12 md:col-span-3">
                  <input value={novoProfNome} onChange={(e) => setNovoProfNome(e.target.value)} className={bareCls} />
                </Field>
                <Field compact label="Cargo" span="col-span-6 md:col-span-2">
                  <input value={novoProfCargo} onChange={(e) => setNovoProfCargo(e.target.value)} className={bareCls} />
                </Field>
                <Field compact label="Telefone" span="col-span-6 md:col-span-2">
                  <input value={novoProfTelefone} onChange={(e) => setNovoProfTelefone(e.target.value)} className={bareCls} />
                </Field>
                <button
                  type="button"
                  onClick={handleCriarProfessor}
                  disabled={isPendingExtra}
                  className="col-span-12 md:col-span-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
                >
                  Salvar professor(a)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={User} label="Dados Pessoais" />

          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome completo" required span="col-span-12 md:col-span-6">
              <input name="nome_completo" required placeholder="Nome completo do aluno" className={bareCls} />
            </Field>
            <Field label="CPF" required span="col-span-6 md:col-span-3">
              <input
                required
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                className={bareCls}
              />
            </Field>
            <Field label="Data de nascimento" span="col-span-6 md:col-span-3" filled={dataNascimento.length === 10}>
              <input
                value={dataNascimento}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => setDataNascimento(maskDate(e.target.value))}
                placeholder="DD/MM/AAAA"
                className={`${bareCls} text-center`}
              />
              {dataPorExtenso(dataNascimento) && (
                <p className="text-[11px] font-medium text-iw-navy text-center mt-0.5">{dataPorExtenso(dataNascimento)}</p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="E-mail" required span="col-span-12 md:col-span-4">
              <input name="email" type="email" required placeholder="aluno@email.com" className={bareCls} />
            </Field>
            <Field label="Telefone" span="col-span-6 md:col-span-3">
              <input
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={bareCls}
              />
            </Field>
            <Field label="RG" span="col-span-6 md:col-span-2">
              <input
                value={rg}
                onChange={(e) => setRg(maskRG(e.target.value))}
                placeholder="00.000.000-0"
                className={bareCls}
              />
            </Field>
            <Field label="Órgão" span="col-span-6 md:col-span-1">
              <input name="rg_orgao_emissor" defaultValue="SSP" className={bareCls} />
            </Field>
            <Field label="UF do RG" span="col-span-6 md:col-span-2">
              <input name="rg_uf" maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="Sexo" span="col-span-6 md:col-span-3" filled={genero.length > 0}>
              <select
                name="genero"
                value={genero}
                onChange={(e) => { setGenero(e.target.value); focarProximoCampo(e.currentTarget); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                {generos.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Estado civil" span="col-span-6 md:col-span-3" filled={estadoCivil.length > 0}>
              <select
                name="estado_civil"
                value={estadoCivil}
                onChange={(e) => { setEstadoCivil(e.target.value); focarProximoCampo(e.currentTarget); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                {estadosCivis.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Escolaridade" span="col-span-6 md:col-span-3" filled={escolaridadeSel.length > 0}>
              <select
                name="escolaridade"
                value={escolaridadeSel}
                onChange={(e) => { setEscolaridadeSel(e.target.value); focarProximoCampo(e.currentTarget); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                {escolaridades.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
            <CampoDeEscolha
              label="Profissão"
              name="profissao"
              span="col-span-6 md:col-span-3"
              itens={profissoes.map((p) => ({ id: p.id, label: p.name }))}
              placeholder="Digite pra buscar"
              permitirLivre
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <CampoNaturalidade
              span="col-span-6 md:col-span-2"
              municipios={municipios}
              onSelecionarCidade={(nome, uf) => { setNaturalidadeCidade(nome); setNaturalidadeEstado(uf); }}
            />
            <Field label="UF" span="col-span-3 md:col-span-1">
              <input
                value={naturalidadeEstado}
                maxLength={2}
                onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase`}
              />
            </Field>
            <Field label="Nacionalidade" span="col-span-3 md:col-span-2">
              <input name="nacionalidade" defaultValue="Brasileira" className={bareCls} />
            </Field>
            <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-7">
              <input
                name="nome_conjuge"
                autoComplete="off"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                className={bareCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome da mãe" span="col-span-12 md:col-span-6">
              <input
                name="nome_mae"
                autoComplete="off"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                className={bareCls}
              />
            </Field>
            <Field label="Nome do pai" span="col-span-12 md:col-span-6">
              <input
                name="nome_pai"
                autoComplete="off"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                className={bareCls}
              />
            </Field>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={MapPin} label="Endereço" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="CEP" span="col-span-6 md:col-span-2">
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
            <Field label="Endereço" span="col-span-12 md:col-span-7">
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Número" span="col-span-6 md:col-span-3">
              <input name="endereco_numero" className={bareCls} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Complemento" span="col-span-12 md:col-span-4">
              <input name="endereco_complemento" className={bareCls} />
            </Field>
            <Field label="Bairro" span="col-span-12 md:col-span-4">
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Cidade" span="col-span-6 md:col-span-3">
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={bareCls} />
            </Field>
            <Field label="UF" span="col-span-6 md:col-span-1">
              <input
                value={estado}
                maxLength={2}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase text-center`}
              />
            </Field>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={Wallet} label="Pagamento" />
          <div className="flex items-center justify-between gap-3 flex-wrap -mt-1">
            <p className="text-xs text-iw-muted">
              Preenchido automaticamente ao escolher o curso (valor fixo em Financeiro &gt; Preços dos Cursos) — pode
              sobrescrever pontualmente aqui, sem alterar o preço padrão. Deixe tudo em branco se essa matrícula não
              tiver cobrança.
            </p>
            {valorTotalPagtoCentavos > 0 && (
              <span className="text-sm font-bold text-iw-gold whitespace-nowrap shrink-0">
                Total: {formatarCentavos(valorTotalPagtoCentavos)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Valor da matrícula (opcional)" span="col-span-6 md:col-span-3">
              <input
                name="valor_matricula"
                value={valorMatricula}
                onChange={(e) => setValorMatricula(e.target.value)}
                placeholder="Ex: 25,00"
                className={bareCls}
              />
            </Field>
            <Field label="Valor da parcela" span="col-span-6 md:col-span-3">
              <input
                name="valor_parcela"
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
                placeholder="Ex: 65,00"
                className={bareCls}
              />
            </Field>
            <Field label="Nº de parcelas" span="col-span-6 md:col-span-2">
              <input
                name="total_parcelas"
                type="number"
                min={1}
                max={12}
                value={numeroParcelasPagto}
                onChange={(e) => setNumeroParcelasPagto(e.target.value)}
                className={bareCls}
              />
            </Field>
            {formaCobranca === "MANUAL" ? (
              <>
                <Field label="1º vencimento" span="col-span-6 md:col-span-2">
                  <input name="data_vencimento" type="date" defaultValue={hoje} className={bareCls} />
                </Field>
                <Field label="Forma de pagamento prevista" span="col-span-12 md:col-span-2">
                  <select name="forma_pagamento_prevista" defaultValue="DINHEIRO" className={bareSelectCls}>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">Pix</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </Field>
              </>
            ) : (
              <div className="col-span-12 flex items-center">
                <p className="text-xs text-iw-muted">
                  Um link de pagamento único Pix/Mercado Pago (Checkout Pro) será gerado no valor total (matrícula +
                  parcelas). A cobrança fica pendente em Financeiro &gt; Contas a Receber até o Mercado Pago
                  confirmar o pagamento — não é possível dividir esse link em parcelas separadas.
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Forma de cobrança" span="col-span-12 md:col-span-4">
              <select
                name="forma_cobranca"
                value={formaCobranca}
                onChange={(e) => setFormaCobranca(e.target.value)}
                className={bareSelectCls}
              >
                <option value="MANUAL">Parcelamento manual (Contas a Receber)</option>
                <option value="MERCADOPAGO">Link de pagamento (Mercado Pago)</option>
              </select>
            </Field>
            <Field label="Quem paga" span="col-span-12 md:col-span-4">
              <select
                name="responsavel_pagamento"
                value={responsavelPagamento}
                onChange={(e) => setResponsavelPagamento(e.target.value)}
                className={bareSelectCls}
              >
                <option value="ALUNO">O próprio aluno</option>
                <option value="IGREJA">Igreja (financiamento interno)</option>
              </select>
            </Field>
            {responsavelPagamento === "IGREJA" && (
              <Field label="Igreja responsável" span="col-span-12 md:col-span-4">
                <select name="church_id" defaultValue="" className={bareSelectCls}>
                  <option value="" disabled>Selecione a igreja</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </div>

        {/* Consentimento LGPD */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={ShieldCheck} label="Consentimento LGPD" />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consentimento_lgpd_aceito"
              value="true"
              defaultChecked
              required
              className="mt-0.5 w-4 h-4 accent-iw-gold shrink-0"
            />
            <span className="text-sm text-iw-navy">
              Declaro que estou ciente das informações acima e autorizo o uso, assim como o
              tratamento dos meus dados pessoais para cadastro e/ou atualização cadastral, de
              acordo com os artigos 7º e 11 da Lei nº 13.709/2018.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
