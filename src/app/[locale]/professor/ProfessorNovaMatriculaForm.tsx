"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, User, MapPin, GraduationCap, Loader2, Send, X, Camera, AlertTriangle, Wallet } from "lucide-react";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";
import { BuscaOuCriarInput, SeletorBuscaDropdown } from "@/components/forms/BuscaOuCriarInput";
import { validarCPF } from "@/utils/cpf";
import { maskPhone } from "@/utils/maskPhone";
import { maskRG } from "@/utils/maskRG";
import { createClient } from "@/utils/supabase/client";
import { useCatalogoCidades, resolverCidadeDigitada } from "@/utils/useCatalogoCidades";
// Reaproveita o mesmo modal de confirmação de parcelas da Nova Matrícula
// Direta da secretaria (27/09/2026, pedido do Joaquim: trazer "todas as
// regras de inserção e preenchimento, principalmente a questão de
// pagamento" pra ficha do professor).
import ConfirmarParcelasModal, {
  type ParcelaPreview,
} from "../(admin)/admin/matriculas/nova/ConfirmarParcelasModal";

// Mesma lógica de datas de NovaMatriculaForm.tsx (admin): 1 vencimento por
// mês a partir do 1º informado, empurrando sábado/domingo pro próximo dia
// útil (só aquela parcela — as demais continuam calculadas a partir da
// data ORIGINAL do 1º vencimento). Feriados de fora por enquanto.
function somarMesesIso(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + meses, dia));
  return d.toISOString().slice(0, 10);
}

function proximoDiaUtil(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const diaDaSemana = d.getUTCDay();
  if (diaDaSemana === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (diaDaSemana === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function textoParaCentavos(valor: string): number {
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

// ============================================================
// Nova Matrícula do professor (20/09/2026, corrigindo lacuna real: a
// versão anterior tinha só 4 campos, nunca mandava convite de acesso
// pro aluno e só gerava a parcela da matrícula). Agora espelha
// matricularDiretoAction (secretaria, admin/matriculas/actions.ts):
// ficha completa (mesmos campos obrigatórios da ficha do mutirão),
// convite por e-mail, e plano de parcelas completo (matrícula + todas
// as mensalidades do curso, básico/médio pelo course_pricing) — tudo
// isso já roda em professorCriarMatriculaAction (actions.ts), sem
// nenhuma mudança aqui; esta tela só manda os mesmos campos de sempre.
//
// 22/09/2026, achados em teste (imagens 1-12, Joaquim):
// 1) Não tinha como fechar sem preencher nada — era um <details>, e
//    clicar fora ou apertar Esc não fazia nada. Virou modal de verdade:
//    botão X, clique no fundo escuro e tecla Esc fecham sem enviar nada.
// 2) O <select> de curso vinha de ead_matriculas já existentes — um
//    professor recém-vinculado a uma turma nova (ex.: 2027, ainda sem
//    nenhum aluno) não tinha NENHUMA opção. Trocado para a turma
//    (course_edition) vinda de professor_turmas, calculada no
//    page.tsx (mesma lista já usada no filtro de "Meus Alunos") — e sem
//    nenhuma pré-selecionada, pra forçar escolha explícita mesmo quando
//    só existe 1 turma.
// 3) RG (número) deixou de ser obrigatório — documento de identidade
//    unificado não traz mais esse número.
//
// 25/09/2026, achado em teste (Joaquim, imagens 1/2 vs. 3-7): mesmo com os
// mesmos campos e nomes de componentes (Field/SectionHeader) de
// nova/NovaMatriculaForm.tsx, o RESULTADO VISUAL era bem diferente — aqui
// cada seção só tinha uma linha fina embaixo do título, sem o cartão
// branco com borda dourada e sombra que o padrão admin usa por seção, e
// sem a foto do aluno. Layout reescrito pra ficar visualmente idêntico:
// cada seção agora é um cartão (bg-white rounded-2xl border-iw-gold
// shadow-sm p-6), com a foto ao lado da primeira, igual
// EditarMatriculaForm.tsx/NovaMatriculaForm.tsx.
// ============================================================

const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;
const boxCls = "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxErrCls = "border border-iw-error rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:ring-2 focus-within:ring-iw-error/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const cardCls = "bg-white rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3";

function Field({
  label, required, span, error, className, filled, children,
}: {
  label: string; required?: boolean; span?: string; error?: string; className?: string; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={span ?? "col-span-12 md:col-span-3"}>
      <div className={`${error ? boxErrCls : boxCls} ${className ?? ""}`}>
        <div className="flex items-center justify-between gap-1">
          <label className={boxLabelCls}>{label}{required && " *"}</label>
          {filled && <span className="w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" aria-hidden="true" />}
        </div>
        {children}
      </div>
      {error && <p className="text-[11px] text-iw-error mt-1">{error}</p>}
    </div>
  );
}

// Naturalidade — busca por nome de cidade (IBGE) com autopreenchimento da
// UF, igual a nova/NovaMatriculaForm.tsx (padrão admin).
type Municipio = { nome: string; uf: string };

function focarProximoCampo(atual: HTMLElement) {
  const form = atual.closest("form");
  if (!form) return;
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
        name="naturalidade_cidade"
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder="Cidade de nascimento"
        className={`${bareCls} cursor-pointer uppercase`}
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
            const [nomeBruto, uf] = item.id.includes("|") ? item.id.split("|") : [item.label, ""];
            const nome = nomeBruto.toUpperCase();
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

interface ProfissaoItem { id: string; name: string }
// 27/09/2026, pedido do Joaquim: courseId adicionado — precisa saber o
// curso por trás da turma escolhida pra pré-preencher a caixa de
// Pagamento com o preço fixo (course_pricing), igual à ficha da secretaria.
interface TurmaOpcao { id: string; label: string; courseId: string }
interface SelectItem { id: string; name: string }
interface ChurchItem { id: string; name: string; sector_id: string | null; unit_id: string | null }
interface PrecoItem { course_id: string; valor_matricula_centavos: number; valor_parcela_centavos: number; numero_parcelas: number }

interface Props {
  action: (formData: FormData) => Promise<void> | void;
  turmasDoProfessor: TurmaOpcao[];
  profissoes: ProfissaoItem[];
  precos: PrecoItem[];
  // 25/09/2026, achado em teste (Joaquim): a página só re-renderiza com um
  // `novoAlunoId` novo na URL logo depois de um matricularCriarAction bem
  // sucedido (ver professor/page.tsx) — usado só pra saber quando fechar e
  // limpar o modal (ver useEffect abaixo), nunca pra decidir se a
  // matrícula deu certo de outra forma.
  justMatriculadoId?: string;
  // 26/09/2026, achado em teste (Joaquim: "acabei de salvar matricular um
  // novo aluno, não fechou o formulário e voltou com dados") -- o modal
  // já ficava aberto de propósito com os dados intactos quando a matrícula
  // falha (ver comentário do `formKey` acima), mas o aviso de erro que a
  // page.tsx mostra via `?error=` fica atrás do fundo escuro do modal,
  // invisível. Passa o erro pra dentro do modal e mostra ele aqui.
  errorMsg?: string;
  // 27/09/2026, pedido do Joaquim: "Nova Matrícula" virou item próprio da
  // sidebar (/professor/matricula), não mais um botão dentro de Alunos.
  // Com autoAbrir, o componente já nasce aberto e sem o botão de gatilho;
  // fechar (X/Cancelar/backdrop/Esc) navega pra voltarHref em vez de só
  // esconder o modal (senão o professor ficaria numa tela em branco).
  autoAbrir?: boolean;
  voltarHref?: string;
}

export default function ProfessorNovaMatriculaForm({
  action, turmasDoProfessor, profissoes, precos, justMatriculadoId, errorMsg, autoAbrir = false, voltarHref = "/professor/alunos",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // 26/09/2026, achado em teste (Joaquim: depois do erro a página tinha
  // sido recarregada de verdade -- ex.: F5 -- e o modal nascia fechado de
  // novo, mostrando só a tarja vermelha da page.tsx sem contexto nenhum de
  // qual ficha ela se referia). Se a página já chega com um erro (mount
  // inicial), o modal já nasce aberto -- o ajuste "reabre sozinho" mais
  // abaixo só cobre a troca de erro numa navegação client-side já em
  // andamento, não o carregamento inicial.
  const [aberto, setAberto] = useState(autoAbrir || !!errorMsg);
  const formRef = useRef<HTMLFormElement | null>(null);
  // 27/09/2026, pedido do Joaquim: caixa de Pagamento igual à Nova
  // Matrícula Direta da secretaria — valor/parcelas pré-preenchidos pelo
  // course_pricing do curso da turma escolhida, editáveis pontualmente.
  const [valorMatricula, setValorMatricula] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [numeroParcelasPagto, setNumeroParcelasPagto] = useState("12");
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [parcelasPreview, setParcelasPreview] = useState<ParcelaPreview[]>([]);
  const [parcelasPagas, setParcelasPagas] = useState<boolean[]>([]);
  const [enviandoConfirmacao, setEnviandoConfirmacao] = useState(false);
  // 25/09/2026, achado em teste (Joaquim, "ainda não fechou o formulário,
  // voltou com sujeira de informações"): o Next.js App Router só troca os
  // searchParams ao redirecionar pro sucesso — como a rota continua sendo
  // /professor, os componentes client (inclusive este modal) NÃO
  // desmontam, e os campos (controlados e não-controlados) ficam com o
  // valor antigo. `formKey` força um remount completo do <form> toda vez
  // que o modal abre ou que uma matrícula acaba de ser criada — único jeito
  // confiável de zerar também os campos não-controlados (defaultValue).
  const [formKey, setFormKey] = useState(0);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  // 27/09/2026, auditoria de padronização de fichas: datalist de Cidade no
  // endereço residencial (mesmo catálogo IBGE + DF do ProfessorForm.tsx).
  const { catalogoCidades } = useCatalogoCidades();
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [naturalidadeEstado, setNaturalidadeEstado] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [escolaridades, setEscolaridades] = useState<SelectItem[]>([]);
  const [setores, setSetores] = useState<SelectItem[]>([]);
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [sedeUnitId, setSedeUnitId] = useState<string | null>(null);
  // 26/09/2026, pedido do Joaquim (achado em teste): "1º vencimento"
  // obrigava digitar a data duas vezes quando é igual à "Data matrícula"
  // (o caso mais comum). Agora "1º vencimento" acompanha "Data matrícula"
  // sozinho, só "solta" desse acompanhamento quando o próprio "1º
  // vencimento" é editado manualmente (pra digitar uma data diferente,
  // se for o caso).
  const hojeIso = new Date().toISOString().slice(0, 10);
  // 27/09/2026, pedido do Joaquim: "Data matrícula" vem preenchida com a
  // data atual do sistema por padrão (igual "1º vencimento") — o professor
  // edita pra uma data passada quando for lançar aluno que já estuda desde
  // antes (as parcelas calculadas a partir daí que decidem sozinhas quais
  // já vêm marcadas como pagas no modal de confirmação).
  const [dataMatricula, setDataMatricula] = useState(hojeIso);
  const [dataVencimento, setDataVencimento] = useState(hojeIso);
  const [vencimentoTocado, setVencimentoTocado] = useState(false);
  // 26/09/2026, padronização pedida pelo Joaquim (varredura geral): SEDE
  // agora é uma OPÇÃO dentro da própria caixa "Setor" (igual
  // ProfessorForm.tsx), não mais um estado implícito de "Setor vazio"
  // (3ª rodada, substitui a correção de ontem).
  const [naSede, setNaSede] = useState(false);

  // Separa Setor/Regional em dois grupos (optgroup) — mesma correção já
  // aplicada nos formulários admin (`sectors` vem alfabético do banco, o
  // que juntaria REGIONAL antes de SETOR se não fosse separado assim).
  const setoresComuns = useMemo(
    () => setores.filter((s) => !s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const setoresRegionais = useMemo(
    () => setores.filter((s) => s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const sedeChurch = useMemo(
    () => (sedeUnitId ? churches.find((c) => c.unit_id === sedeUnitId) ?? null : null),
    [sedeUnitId, churches]
  );
  // Sem Setor/SEDE escolhido → lista vazia (Igreja fica desabilitada);
  // com SEDE escolhida → só ela; com um Setor escolhido → só as igrejas
  // daquele Setor, sem a Sede misturada (church.sector_id dela é nulo).
  const igrejasDoSetor = useMemo(() => {
    if (naSede) return sedeChurch ? [sedeChurch] : [];
    if (!sectorId) return [];
    return churches.filter((c) => c.sector_id === sectorId);
  }, [naSede, sectorId, churches, sedeChurch]);

  const handleSectorChange = (value: string) => {
    if (sedeChurch && value === sedeChurch.id) {
      setNaSede(true);
      setSectorId("");
      setChurchId(sedeChurch.id);
    } else {
      setNaSede(false);
      setSectorId(value);
      setChurchId("");
    }
  };

  function resetarFormulario() {
    setCpf(""); setCpfError("");
    setTelefone("");
    setCep(""); setEndereco(""); setEnderecoComplemento(""); setBairro(""); setCidade(""); setEstado(""); setCepError("");
    setFotoUrl("");
    setNaturalidadeEstado("");
    setSectorId(""); setChurchId("");
    setDataMatricula(hojeIso); setDataVencimento(hojeIso); setVencimentoTocado(false);
    setValorMatricula(""); setValorParcela(""); setNumeroParcelasPagto("12");
    setParcelasPreview([]); setParcelasPagas([]);
    setFormKey((k) => k + 1);
  }

  // 27/09/2026: fechar (X, backdrop, Esc, Cancelar) — em modo autoAbrir
  // (rota própria /professor/matricula) não existe pra onde "voltar" senão
  // navegando embora; no modo antigo (botão dentro de Alunos) só esconde.
  function fecharModal() {
    if (autoAbrir) {
      router.push(voltarHref);
      return;
    }
    setAberto(false);
  }

  // Abrir o modal (de novo ou pela 1ª vez) sempre começa com ficha zerada —
  // cobre tanto reabrir depois de "Cancelar" quanto depois de matricular.
  const abrirModal = () => {
    resetarFormulario();
    setAberto(true);
  };

  // Fecha e limpa sozinho assim que a página recebe o `novoAlunoId` da
  // matrícula recém-criada (ver comentário no tipo Props acima). Ajuste de
  // estado a partir de mudança de prop feito durante a renderização (não
  // dentro de um efeito) — padrão "Adjusting state when a prop changes" da
  // documentação do React. Usa useState (não useRef) pra guardar o valor
  // anterior, porque o React Compiler deste projeto proíbe leitura/escrita
  // de ref durante o render (react-hooks/refs) — só useState é permitido
  // aqui. Evita tanto o cascading render do setState-dentro-de-effect
  // quanto o acesso a ref durante render.
  const [justMatriculadoIdAnterior, setJustMatriculadoIdAnterior] = useState(justMatriculadoId);
  if (justMatriculadoIdAnterior !== justMatriculadoId) {
    setJustMatriculadoIdAnterior(justMatriculadoId);
    if (justMatriculadoId) {
      setAberto(false);
      resetarFormulario();
    }
  }

  // 26/09/2026, mesmo padrão acima: se chegar um erro novo (a matrícula foi
  // rejeitada -- CPF inválido, campo obrigatório em branco etc.), garante
  // que o modal esteja aberto pra mostrar o aviso onde o professor está
  // olhando, mesmo se por algum motivo ele tivesse fechado antes do
  // redirect.
  const [errorMsgAnterior, setErrorMsgAnterior] = useState(errorMsg);
  if (errorMsgAnterior !== errorMsg) {
    setErrorMsgAnterior(errorMsg);
    if (errorMsg) setAberto(true);
  }

  useEffect(() => {
    async function fetchDropdowns() {
      const supabase = createClient();
      const [esc, set, chu, sede] = await Promise.all([
        supabase.from("settings_schooling").select("id, name").order("name"),
        supabase.from("sectors").select("id, name").order("name"),
        supabase.from("churches").select("id, name, sector_id, unit_id").order("name"),
        supabase.from("units").select("id").eq("type", "SEDE").maybeSingle(),
      ]);
      if (esc.data) setEscolaridades(esc.data as SelectItem[]);
      if (set.data) setSetores(set.data as SelectItem[]);
      if (chu.data) setChurches(chu.data as ChurchItem[]);
      if (sede.data) setSedeUnitId(sede.data.id);
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
      alert(`Erro no upload da foto: ${msg}`);
    } finally {
      setUploadingFoto(false);
    }
  };

  // Fecha com a tecla Esc, e trava o scroll da página atrás do modal.
  useEffect(() => {
    if (!aberto || autoAbrir) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharModal();
    };
    document.addEventListener("keydown", onKeyDown);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowOriginal;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, autoAbrir]);

  const checkCpf = (valor: string) => {
    const digitos = valor.replace(/\D/g, "");
    if (!digitos || digitos.length < 11) { setCpfError(""); return; }
    setCpfError(validarCPF(valor) ? "" : "CPF inválido — confira os números digitados.");
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
        if (data.logradouro) setEndereco(data.logradouro.toUpperCase());
        if (data.bairro) setBairro(data.bairro.toUpperCase());
        if (data.localidade) setCidade(data.localidade.toUpperCase());
        if (data.uf) setEstado(data.uf.toUpperCase());
        setEnderecoComplemento(data.complemento?.toUpperCase() || "");
      }
    } catch {
      setCepError("Não foi possível consultar o CEP agora — preencha o endereço na mão.");
    } finally {
      setLoadingCep(false);
    }
  };

  function handleSubmit(formData: FormData) {
    if (cpfError) return;
    // 26/09/2026: quando o Setor escolhido é a SEDE, o valor exibido na
    // caixa (pro <select> mostrar "SEDE — nome" selecionado) é o id da
    // igreja Sede, não um sector_id de verdade (Sede não pertence a
    // nenhum Setor) — corrige aqui antes de enviar, senão o servidor
    // salvaria um sector_id inválido (id de igreja, não de setor).
    formData.set("sector_id", naSede ? "" : sectorId);
    // 27/09/2026, pedido do Joaquim: se passou pelo modal de confirmação de
    // parcelas, manda as datas/status já decididos ali.
    if (parcelasPreview.length > 0) {
      const overrides = parcelasPreview.map((p, i) => ({
        numero: p.numero,
        total: parcelasPreview.length,
        data_vencimento: p.vencimentoFinal,
        valor_centavos: p.valorCentavos,
        paga: parcelasPagas[i] ?? false,
      }));
      formData.set("parcelas_mensalidade_json", JSON.stringify(overrides));
    }
    startTransition(() => {
      action(formData);
    });
  }

  // 27/09/2026, pedido do Joaquim: mesma prévia de parcelas da Nova
  // Matrícula Direta admin — calcula 1 vencimento por mês a partir do "1º
  // vencimento" já preenchido no form (estado dataVencimento), empurra fim
  // de semana pro próximo dia útil, e decide o estado inicial de "já paga"
  // conforme "Aluno já estuda desde antes?".
  function computeParcelasPreview(): ParcelaPreview[] {
    const total = Math.max(1, Number(numeroParcelasPagto) || 1);
    const valorParcelaCent = textoParaCentavos(valorParcela);
    if (valorParcelaCent <= 0) return [];
    return Array.from({ length: total }, (_, i) => {
      const original = somarMesesIso(dataVencimento, i);
      return {
        numero: i + 1,
        vencimentoOriginal: original,
        vencimentoFinal: proximoDiaUtil(original),
        valorCentavos: valorParcelaCent,
      };
    });
  }

  function handleClickGerar() {
    if (cpfError) return;
    if (!formRef.current?.reportValidity()) return;
    const preview = computeParcelasPreview();
    if (preview.length === 0) {
      setParcelasPreview([]);
      setParcelasPagas([]);
      formRef.current?.requestSubmit();
      return;
    }
    setParcelasPreview(preview);
    // 27/09/2026, pedido do Joaquim: sem toggle manual — "já paga" vem
    // marcada sozinha quando o vencimento já passou ou é hoje.
    setParcelasPagas(preview.map((p) => p.vencimentoOriginal <= hojeIso));
    setMostrarConfirmacao(true);
  }

  function handleConfirmarParcelas() {
    setEnviandoConfirmacao(true);
    setMostrarConfirmacao(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      {!autoAbrir && (
        <button
          type="button"
          onClick={abrirModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFFFFF] text-iw-navy border-[1.5px] border-[#CF8403] hover:bg-iw-gold/10 transition-colors shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Nova Matrícula
        </button>
      )}

      {aberto && (
        // 27/09/2026, pedido do Joaquim: em /professor/matricula (autoAbrir)
        // a ficha aparece NA página, igual a admin/matriculas/nova — sem
        // fundo escuro nem painel flutuante por cima do conteúdo. No modo
        // antigo (botão dentro de Alunos), continua sendo um modal de
        // verdade por cima da tela.
        <div className={autoAbrir ? "max-w-[1400px] mx-auto pb-16 px-2" : "fixed inset-0 z-[60] flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto"}>
          {/* Fundo escuro — só no modo modal; clicar fora fecha sem enviar nada. */}
          {!autoAbrir && <div className="fixed inset-0 bg-black/50" onClick={fecharModal} />}

          <div className={autoAbrir ? "bg-iw-bg border border-iw-gold rounded-2xl shadow-sm" : "relative w-full max-w-6xl bg-iw-bg border border-iw-gold rounded-2xl shadow-xl my-auto"}>
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border bg-iw-surface rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-iw-gold" />
                </span>
                <h2 className="text-sm font-bold text-iw-navy">Nova Matrícula</h2>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                title={autoAbrir ? "Voltar para Meus Alunos" : "Fechar sem matricular"}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-iw-muted hover:text-iw-navy hover:bg-iw-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              key={formKey}
              ref={formRef}
              action={handleSubmit}
              className={autoAbrir ? "p-5 pt-4 space-y-5" : "p-5 pt-4 space-y-5 max-h-[80vh] overflow-y-auto"}
            >
              {errorMsg && (
                <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {/* Foto do aluno + Turma — mesmo layout de
                  NovaMatriculaForm.tsx/EditarMatriculaForm.tsx: foto à
                  esquerda, primeiro cartão à direita. */}
              <div className="grid grid-cols-12 gap-4 items-stretch">
                {/* 26/09/2026, achado em teste (Joaquim): círculo estava
                    maior que o padrão (col-span-3) -- mesma medida de
                    NovaMatriculaForm.tsx (secretaria, col-span-2). */}
                <div className="col-span-12 md:col-span-2 flex flex-col items-start justify-start gap-2">
                  <div className="w-full aspect-square rounded-full bg-transparent border-[1.5px] border-[#E88D0C]/40 flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors">
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl} alt="Foto do aluno" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-iw-muted group-hover:text-iw-navy">
                        {uploadingFoto ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
                        <span className="text-[10px] font-semibold uppercase text-center px-2">Foto do aluno</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <p className="text-[11px] text-iw-muted">Aparece na ficha e no PDF de matrícula.</p>
                  <input type="hidden" name="foto_url" value={fotoUrl} />
                </div>

                <div className={`col-span-12 md:col-span-10 ${cardCls}`}>
                  <SectionHeader icon={GraduationCap} label="Turma" />
                  <div className="grid grid-cols-12 gap-3">
                    <Field label="Curso e turma" required span="col-span-12">
                      <select
                        name="course_edition_id"
                        required
                        defaultValue=""
                        onChange={(e) => {
                          // 27/09/2026, pedido do Joaquim: pré-preenche a
                          // caixa de Pagamento com o preço fixo do curso
                          // (course_pricing) assim que a turma é escolhida —
                          // mesma regra da Nova Matrícula Direta admin.
                          const turma = turmasDoProfessor.find((t) => t.id === e.target.value);
                          const preco = turma ? precos.find((p) => p.course_id === turma.courseId) : undefined;
                          setValorMatricula(preco ? centavosParaTexto(preco.valor_matricula_centavos) : "");
                          setValorParcela(preco ? centavosParaTexto(preco.valor_parcela_centavos) : "");
                          setNumeroParcelasPagto(preco ? String(preco.numero_parcelas) : "12");
                        }}
                        className={bareSelectCls}
                      >
                        <option value="" disabled>
                          Selecione a turma...
                        </option>
                        {turmasDoProfessor.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {/* 25/09/2026, achado em teste (Joaquim): Setor/Igreja/Data
                      da matrícula vieram pra dentro do mesmo cartão "Turma"
                      (antes eram um cartão "Igreja e matrícula" separado) —
                      pedido explícito pra juntar tudo aqui. */}
                  <div className="grid grid-cols-12 gap-3">
                    <Field label="Setor" required span="col-span-6 md:col-span-3">
                      <select
                        name="sector_id"
                        value={naSede ? (sedeChurch?.id ?? "") : sectorId}
                        onChange={(e) => handleSectorChange(e.target.value)}
                        className={bareSelectCls}
                      >
                        <option value="">Selecione...</option>
                        {sedeChurch && <option value={sedeChurch.id}>SEDE — {sedeChurch.name}</option>}
                        <optgroup label="Setor">
                          {setoresComuns.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Regional">
                          {setoresRegionais.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </Field>
                    <Field label="Igreja" required span="col-span-6 md:col-span-3">
                      <select
                        name="church_id"
                        required
                        value={churchId}
                        onChange={(e) => setChurchId(e.target.value)}
                        disabled={!sectorId && !naSede}
                        className={bareSelectCls}
                      >
                        <option value="">
                          {naSede ? "SEDE selecionada acima" : sectorId ? "Selecione..." : "Escolha o setor primeiro"}
                        </option>
                        {igrejasDoSetor.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Data matrícula" span="col-span-12 md:col-span-3">
                      <input
                        name="data_matricula_informada"
                        type="date"
                        value={dataMatricula}
                        max={hojeIso}
                        onChange={(e) => {
                          const valor = e.target.value;
                          setDataMatricula(valor);
                          // Acompanha "1º vencimento" sozinho enquanto o
                          // usuário não tiver editado ele na mão — cobre o
                          // caso mais comum (as duas datas iguais) sem
                          // obrigar digitar a mesma data duas vezes.
                          if (!vencimentoTocado) setDataVencimento(valor || hojeIso);
                        }}
                        className={bareCls}
                      />
                    </Field>
                    {/* 26/09/2026, pedido do Joaquim (achado em teste): a ficha
                        do professor não tinha "lançamento financeiro" nenhum —
                        matrícula e 1ª parcela da mensalidade sempre nasciam
                        vencendo no mesmo dia, sem jeito de mudar isso por aqui.
                        Campo separado, igual ao "1º vencimento" que já existe
                        na Nova Matrícula da secretaria (NovaMatriculaForm.tsx)
                        -- decide só a data de vencimento; "Data matrícula"
                        continua controlando desde quando o aluno já cursa.
                        Acompanha "Data matrícula" sozinho até ser editado na
                        mão (ver onChange abaixo). */}
                    <Field label="1º vencimento" span="col-span-12 md:col-span-3">
                      <input
                        name="data_vencimento"
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => { setDataVencimento(e.target.value); setVencimentoTocado(true); }}
                        className={bareCls}
                      />
                    </Field>
                  </div>
                  {/* 26/09/2026, pedido do Joaquim: texto explicativo removido
                      -- o treinamento dos professores vai cobrir isso, não
                      precisa ficar escrito na própria ficha. */}
                </div>
              </div>

              {/* 25/09/2026, achado em teste (Joaquim): campos batiam, mas a
                  ORDEM não era a mesma de EditarMatriculaForm.tsx (padrão
                  admin) — reorganizado linha a linha pra ficar idêntico:
                  Nome/CPF/Nascimento → E-mail/Telefone/RG/Órgão/UF RG →
                  Sexo/Est.civil/Escolaridade/Profissão →
                  Naturalidade/UF/Nacionalidade/Cônjuge → Mãe/Pai. */}
              <div className={cardCls}>
                <SectionHeader icon={User} label="Dados pessoais" />
                <div className="grid grid-cols-12 gap-3">
                  <Field label="Nome completo" required span="col-span-12 md:col-span-6">
                    <input name="nome_completo" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="CPF" required span="col-span-6 md:col-span-3" error={cpfError}>
                    <input
                      name="cpf"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      onBlur={(e) => checkCpf(e.target.value)}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="Data de nascimento" required span="col-span-6 md:col-span-3">
                    <input name="data_nascimento" required type="date" className={bareCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="E-mail" required span="col-span-12 md:col-span-4">
                    <input name="email" type="email" required className={bareCls} />
                  </Field>
                  <Field label="Telefone" required span="col-span-12 md:col-span-3">
                    <input
                      name="telefone"
                      required
                      placeholder="(00) 00000-0000 ou +55 11 90000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="RG" span="col-span-6 md:col-span-2">
                    {/* 28/09/2026, achado do Joaquim: única ficha que ainda
                        faltava a máscara de RG (as outras já tinham, ver
                        maskRG.ts) — campo não controlado, só reformata a
                        cada tecla. */}
                    <input
                      name="rg"
                      placeholder="00.000.000-0"
                      onChange={(e) => { e.target.value = maskRG(e.target.value); }}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="Órgão" required span="col-span-6 md:col-span-1">
                    <input name="rg_orgao_emissor" required defaultValue="SSP" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="UF do RG" required span="col-span-6 md:col-span-2">
                    <input name="rg_uf" required maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Sexo" required span="col-span-6 md:col-span-3">
                    {/* 28/09/2026, pedido do Joaquim: o valor exibido nas
                        selects desta ficha aparecia em caixa baixa/mista
                        ("Masculino", "Solteiro(a)"), diferente do resto da
                        ficha (tudo em maiúsculo) — `uppercase` transforma só
                        a exibição, sem mudar o valor gravado. */}
                    <select name="genero" required defaultValue="" className={`${bareSelectCls} uppercase`}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </Field>
                  <Field label="Estado civil" required span="col-span-6 md:col-span-3">
                    <select name="estado_civil" required defaultValue="" className={`${bareSelectCls} uppercase`}>
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </Field>
                  {/* 25/09/2026, achado em teste (Joaquim): estava como texto
                      livre, sem busca — digitava errado ("SUOPERIOR") sem
                      nenhuma lista pra escolher. Agora busca em
                      settings_schooling, igual à ficha admin. */}
                  <Field label="Escolaridade" required span="col-span-6 md:col-span-3">
                    <BuscaOuCriarInput
                      name="escolaridade"
                      required
                      itens={escolaridades.map((e) => ({ id: e.id, label: e.name }))}
                      placeholder="Digite pra buscar"
                      permitirLivre
                      className={`${bareCls} cursor-pointer uppercase`}
                    />
                  </Field>
                  <Field label="Profissão" span="col-span-6 md:col-span-3">
                    <BuscaOuCriarInput
                      name="profissao"
                      itens={profissoes.map((p) => ({ id: p.id, label: p.name }))}
                      placeholder="Digite pra buscar"
                      permitirLivre
                      className={`${bareCls} cursor-pointer uppercase`}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  {/* 25/09/2026, achado em teste: mesma correção — busca por
                      cidade (IBGE) com UF preenchida sozinha, igual à ficha
                      admin, em vez de texto livre. */}
                  <CampoNaturalidade
                    span="col-span-6 md:col-span-2"
                    municipios={municipios}
                    onSelecionarCidade={(_nome, uf) => setNaturalidadeEstado(uf)}
                  />
                  <Field label="UF" required span="col-span-3 md:col-span-1">
                    <input
                      name="naturalidade_estado"
                      required
                      maxLength={2}
                      value={naturalidadeEstado}
                      onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Nacionalidade" required span="col-span-3 md:col-span-2">
                    <input name="nacionalidade" required defaultValue="Brasileira" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-7">
                    <input name="nome_conjuge" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Nome da mãe" required span="col-span-12 md:col-span-6">
                    <input name="nome_mae" required autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Nome do pai" span="col-span-12 md:col-span-6">
                    <input name="nome_pai" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>
              </div>

              <div className={cardCls}>
                <SectionHeader icon={MapPin} label="Endereço" />
                <div className="grid grid-cols-12 gap-3">
                  <Field label={loadingCep ? "CEP (buscando...)" : "CEP"} required span="col-span-6 md:col-span-2" error={cepError}>
                    <input
                      name="cep"
                      required
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleBlurCep}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="Endereço" required span="col-span-12 md:col-span-7">
                    <input
                      name="endereco"
                      required
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Número" required span="col-span-6 md:col-span-3">
                    <input name="endereco_numero" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <Field label="Complemento" span="col-span-12 md:col-span-4">
                    <input
                      name="endereco_complemento"
                      value={enderecoComplemento}
                      onChange={(e) => setEnderecoComplemento(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Bairro" required span="col-span-12 md:col-span-4">
                    <input
                      name="bairro"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Cidade" required span="col-span-6 md:col-span-3">
                    <input
                      name="cidade"
                      required
                      list="lista-cidades-endereco-professor-matricula"
                      value={cidade}
                      onChange={(e) => {
                        const { cidade: nome, uf } = resolverCidadeDigitada(e.target.value, catalogoCidades);
                        setCidade(nome);
                        if (uf) setEstado(uf);
                      }}
                      className={`${bareCls} uppercase`}
                    />
                    <datalist id="lista-cidades-endereco-professor-matricula">
                      {catalogoCidades.map((c) => (
                        <option key={`${c.nome}-${c.uf}`} value={`${c.nome} (${c.uf})`} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="UF" required span="col-span-6 md:col-span-1">
                    <input
                      name="estado"
                      required
                      maxLength={2}
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                </div>
              </div>

              {/* 27/09/2026, pedido do Joaquim: caixa de Pagamento igual à
                  Nova Matrícula Direta da secretaria — pré-preenchida pelo
                  course_pricing ao escolher a turma, editável pontualmente.
                  "Aluno já estuda desde antes?" decide o estado inicial das
                  parcelas no modal de confirmação (abaixo). */}
              <div className={cardCls}>
                <SectionHeader icon={Wallet} label="Pagamento" />
                <p className="text-xs text-iw-muted -mt-1">
                  Preenchido automaticamente ao escolher a turma (valor fixo em Financeiro &gt; Preços dos
                  Cursos) — pode sobrescrever pontualmente aqui, sem alterar o preço padrão. Deixe tudo em
                  branco se essa matrícula não tiver cobrança.
                </p>
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
                  <Field label="Forma de pagamento prevista" span="col-span-12 md:col-span-4">
                    <select name="forma_pagamento_prevista" defaultValue="PIX" className={bareSelectCls}>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="DEBITO">Débito</option>
                      <option value="CREDITO">Crédito</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* 26/09/2026, achado em teste (Joaquim): botão "Matricular"
                  esticando com flex-1 fugia do padrão estético das outras
                  fichas (ex.: ProfessorForm.tsx) -- botões de largura fixa,
                  alinhados à direita, não ocupando a largura toda. */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-iw-navy border border-black hover:bg-iw-bg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleClickGerar}
                  disabled={pending || !!cpfError}
                  className="inline-flex items-center justify-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl transition-opacity border border-black"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Matriculando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Matricular
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarConfirmacao && (
        <ConfirmarParcelasModal
          parcelas={parcelasPreview}
          pagas={parcelasPagas}
          onTogglePaga={(index) => {
            setParcelasPagas((prev) => {
              const copia = [...prev];
              copia[index] = !copia[index];
              return copia;
            });
          }}
          dataMatriculaIso={dataMatricula || hojeIso}
          enviando={enviandoConfirmacao}
          onCancelar={() => setMostrarConfirmacao(false)}
          onConfirmar={handleConfirmarParcelas}
        />
      )}
    </>
  );
}
