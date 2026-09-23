"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Send, Loader2, AlertTriangle, CheckCircle2, User, GraduationCap, MapPin, Wallet, QrCode, Copy, Check, Ban, History, Camera,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";
import PageHeader from "@/components/layout/PageHeader";
import {
  atualizarMatriculaAction, lancarPagamentoRetroativoAction, cancelarMatriculaAction, gerarParcelasMensalidadeAction,
} from "../actions";
import { baixarParcelaAction, cancelarParcelaAction } from "../../financeiro/actions";
import { resolverCampoPadraoId } from "@/utils/campos/campoPadrao";
import { BuscaOuCriarInput, SeletorBuscaDropdown } from "@/components/forms/BuscaOuCriarInput";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type SelectItem = { id: string; name: string };
type Church = { id: string; name: string; sector_id: string | null };
type Turma = { id: string; nome: string; course_id: string };
type Professor = { id: string; nome_completo: string; church_id: string | null };

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  matricula: string;
  status: string;
  curso_pretendido: string | null;
  campo_ministerio_id: string | null;
  sector_id: string | null;
  church_id: string | null;
  rg: string | null;
  rg_orgao_emissor: string | null;
  rg_uf: string | null;
  data_nascimento: string | null;
  genero: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  profissao: string | null;
  naturalidade_cidade: string | null;
  naturalidade_estado: string | null;
  nome_conjuge: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  cep: string | null;
  endereco: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  nacionalidade: string | null;
  foto_url: string | null;
}

interface Matricula {
  id: string;
  aluno_id: string;
  course_id: string;
  curso_nome_snapshot: string;
  matricula: string;
  status: string;
  course_edition_id: string | null;
  professor_id: string | null;
}

interface Pagamento {
  id: string;
  descricao: string;
  valor_bruto_centavos: number;
  status: string;
  forma_pagamento_prevista: string;
  data_vencimento: string;
  pago_em: string | null;
  numero_parcela: number;
  total_parcelas: number;
}

// 21/09/2026, pedido do Joaquim: PENDENTE deixou de ser um estado único —
// agora tem 3 graus visuais pra parcela ainda não paga: EM_DIA (falta mais
// de 7 dias), PENDENTE (vence nos próximos 7 dias, incluso hoje) e ATRASADO
// (já venceu). PAGO/CANCELADO continuam como sempre. O valor gravado no
// banco continua só PENDENTE/PAGO/ATRASADO/CANCELADO (ver constraint de
// fin_contas_receber) — esse recorte de 3 graus é só visual, calculado aqui.
function statusEfetivoPagamento(p: Pagamento): string {
  if (p.status !== "PENDENTE") return p.status;
  const hoje = new Date().toISOString().slice(0, 10);
  if (p.data_vencimento < hoje) return "ATRASADO";
  const diasParaVencer = Math.round(
    (new Date(p.data_vencimento).getTime() - new Date(hoje).getTime()) / 86_400_000
  );
  return diasParaVencer <= 7 ? "PENDENTE" : "EM_DIA";
}

// ── Estilo padronizado com nova/NovaMatriculaForm.tsx (21/09/2026, pedido
// do Joaquim: "temos que padronizar nossos formulários") — mesma caixa com
// destaque dourado ao focar (borda + fundo suave), mesma variante compacta
// usada no card "Curso e Vínculo".
const boxCls =
  "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxClsCompact =
  "border border-iw-navy rounded-lg px-2.5 pt-1 pb-1.5 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({
  label, required, span, compact, children,
}: {
  label: string; required?: boolean; span?: string; compact?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`${compact ? boxClsCompact : boxCls} ${span ?? "col-span-12 md:col-span-3"}`}>
      <label className={boxLabelCls}>{label}{required && " *"}</label>
      {children}
    </div>
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

type Municipio = { nome: string; uf: string };

// 21/09/2026, achado em teste (Teste 3, imagens 5/6): Escolaridade e
// Naturalidade — cidade eram <input> de texto livre, sem busca nenhuma —
// diferente de nova/NovaMatriculaForm.tsx, que já tinha essa busca. Este
// componente replica exatamente o CampoNaturalidade de lá: busca por
// cidade (lista do IBGE) que já preenche a UF junto.
function CampoNaturalidadeCidade({
  span, required, valor, municipios, onSelecionar,
}: {
  span?: string;
  required?: boolean;
  valor: string;
  municipios: Municipio[];
  onSelecionar: (nome: string, uf: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const itens = useMemo(
    () => municipios.map((m, i) => ({ id: `${m.nome}|${m.uf}|${i}`, label: m.nome, sublabel: m.uf })),
    [municipios]
  );

  return (
    <Field label="Naturalidade — cidade" required={required} span={span}>
      <div className="relative">
        <input
          name="naturalidade_cidade"
          value={valor}
          readOnly
          required={required}
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
              onSelecionar(nomeBruto.toUpperCase(), uf);
              setAberto(false);
            }}
          />
        )}
      </div>
    </Field>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity border border-black"
    >
      {pending ? (<><Loader2 className="w-4 h-4 animate-spin" /> {pendingLabel}</>) : (<><Send className="w-4 h-4" /> {label}</>)}
    </button>
  );
}

const PAGAMENTO_STATUS_STYLE: Record<string, string> = {
  PAGO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  // 21/09/2026, pedido do Joaquim: os 3 graus de "não pago" (ver
  // statusEfetivoPagamento) usam a mesma moldura (fundo branco + borda
  // dourada 1.5px), só a cor do texto muda por urgência. (Correção
  // 21/09/2026: o código certo é #FFFFFF -- #0D0D0D foi engano meu antes.)
  EM_DIA: "bg-[#FFFFFF] text-[#0000FF] border-[1.5px] border-[#CF8403]",
  PENDENTE: "bg-[#FFFFFF] text-[#CF8403] border-[1.5px] border-[#CF8403]",
  ATRASADO: "bg-[#FFFFFF] text-[#EE4B2B] border-[1.5px] border-[#CF8403]",
  CANCELADO: "bg-iw-bg text-iw-muted border-iw-border",
};

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

export default function EditarMatriculaForm({
  matricula, aluno, campos, churches, setores, turmas, professores, profissoes = [], escolaridades = [], pagamentos, caixaAbertoId, errorMsg, successMsg,
  voltarPara = "/admin/matriculas", voltarLabel = "Voltar para Matrículas",
  selfService = false, action, turmaNomeExibicao, professorNomeExibicao, campoNomeExibicao, setorNomeExibicao, igrejaNomeExibicao,
}: {
  matricula: Matricula;
  aluno: Aluno;
  campos: CampoMinisterio[];
  churches: Church[];
  setores: SelectItem[];
  turmas: Turma[];
  professores: Professor[];
  // Lista de profissões (settings_professions) pro campo de busca do
  // "Profissão" — opcional/[] por padrão pra não quebrar nenhum outro
  // ponto que ainda não passa essa prop.
  profissoes?: SelectItem[];
  // Lista de escolaridades (settings_schooling) pro campo de busca de
  // "Escolaridade" — mesmo padrão de profissoes acima. Opcional/[] por
  // padrão pra não quebrar nenhum outro ponto que ainda não passa essa prop.
  escolaridades?: SelectItem[];
  pagamentos: Pagamento[];
  caixaAbertoId: string;
  errorMsg?: string;
  successMsg?: string;
  // Esta tela é aberta de dois lugares — da lista de Matrículas E do
  // cadastro de Aluno em Configuracões > Persona (botão "Editar cadastro
  // completo") — o botão Voltar precisa respeitar de onde veio, senão
  // sempre manda pra lista de Matrículas mesmo quem entrou pelo Aluno
  // (bug reportado 15/09/2026). Vem via searchParams ?voltarPara=&voltarLabel=
  // na page.tsx; sem eles, cai no padrão de sempre (lista de Matrículas).
  voltarPara?: string;
  voltarLabel?: string;
  // ── Modo self-service (20/09/2026, pedido do Joaquim) — reaproveita
  // esta MESMA tela pro aluno completar a própria ficha no primeiro
  // acesso (/completar-cadastro), igual já foi feito com ProfessorForm.
  // Em selfService: sem foto/pagamentos/cancelar-matrícula/voltar pra
  // admin, e Curso/Turma/Professor/Campo/Setor/Igreja viram somente
  // leitura (o aluno não escolhe isso -- já veio herdado do link da
  // turma) em vez dos <select> que a secretaria usa.
  selfService?: boolean;
  action?: (formData: FormData) => Promise<void> | void;
  turmaNomeExibicao?: string;
  professorNomeExibicao?: string;
  campoNomeExibicao?: string;
  setorNomeExibicao?: string;
  igrejaNomeExibicao?: string;
}) {
  const [sectorId, setSectorId] = useState(aluno.sector_id ?? "");
  const [churchId, setChurchId] = useState(aluno.church_id ?? "");
  const [copiado, setCopiado] = useState(false);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [fotoUrl, setFotoUrl] = useState(aluno.foto_url ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [naturalidadeCidade, setNaturalidadeCidade] = useState(aluno.naturalidade_cidade ?? "");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState(aluno.naturalidade_estado ?? "");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const enderecoRef = useRef<HTMLInputElement | null>(null);
  const bairroRef = useRef<HTMLInputElement | null>(null);
  const cidadeRef = useRef<HTMLInputElement | null>(null);
  const estadoRef = useRef<HTMLInputElement | null>(null);

  // 21/09/2026, achado em teste (Teste 3, "CEP não atualiza"): esta tela
  // nunca teve busca de CEP (diferente de NovaMatriculaForm.tsx, que já
  // buscava) — eu tinha dito por engano que já funcionava; não funcionava.
  // Endereço/Bairro/Cidade/UF continuam campos não controlados (defaultValue),
  // então em vez de converter o formulário inteiro pra estado controlado,
  // atualiza o valor direto no DOM via ref quando o CEP resolve — mesmo
  // resultado, bem menos risco de quebrar os outros campos desta tela.
  const handleBlurCep = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (enderecoRef.current) enderecoRef.current.value = (data.logradouro ?? "").toUpperCase();
        if (bairroRef.current) bairroRef.current.value = (data.bairro ?? "").toUpperCase();
        if (cidadeRef.current) cidadeRef.current.value = (data.localidade ?? "").toUpperCase();
        if (estadoRef.current) estadoRef.current.value = (data.uf ?? "").toUpperCase();
      }
    } catch {
      // silencioso — os campos continuam editáveis manualmente
    } finally {
      setLoadingCep(false);
    }
  };

  // Mesma busca de municípios do IBGE usada em NovaMatriculaForm.tsx —
  // ver comentário em CampoNaturalidadeCidade acima.
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

  // Upload da foto do aluno — mesmo bucket "avatars" usado no cadastro
  // direto (nova/NovaMatriculaForm.tsx). Faltava aqui: quando a matrícula
  // era criada pela Ficha Rápida (sem foto) não tinha como adicionar
  // depois — só editar dados, sem opção de foto.
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

  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );
  const turmasDoCurso = useMemo(
    () => turmas.filter((t) => t.course_id === matricula.course_id),
    [turmas, matricula.course_id]
  );

  // 21/09/2026, achado em teste (Ana Magna, Teste 3): matrículas feitas
  // pelo link do mutirão antes da correção do bug ficaram sem a
  // Mensalidade lançada (só a Matrícula, se houver) — ver comentário em
  // gerarParcelasMensalidadeAction. Mostra o botão de conserto só quando
  // realmente falta.
  const temMensalidadeLancada = useMemo(
    () => pagamentos.some((p) => p.descricao.startsWith("Mensalidade —")),
    [pagamentos]
  );

  const linkContinuacao =
    typeof window !== "undefined" ? `${window.location.origin}/confirmar-cadastro/${aluno.id}` : `/confirmar-cadastro/${aluno.id}`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkContinuacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // link já está visível na tela pra copiar manualmente
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-16 px-2">
      <PageHeader
        icon={GraduationCap}
        title={selfService ? "Complete seu cadastro" : `Editar matrícula — ${matricula.matricula}`}
        description={selfService ? matricula.curso_nome_snapshot : `${aluno.nome_completo} — ${matricula.curso_nome_snapshot}`}
        backHref={selfService ? undefined : voltarPara}
        backLabel={voltarLabel}
        backNovoPadrao
      />

      {/* Wrappers sempre montados — evita remontar os formulários (e perder
          dados já digitados) quando um banner aparece/some. */}
      <div>
        {successMsg && (
          <div className="flex items-center gap-3 bg-iw-success-bg border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
      </div>
      <div>
        {errorMsg && (
          <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
      </div>

      {!selfService && aluno.status === "FICHA_PENDENTE" && (
        <div className="bg-iw-gold/10 border border-iw-gold/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-iw-navy font-bold text-sm">
            <QrCode className="w-4 h-4" />
            Cadastro ainda pendente — a pessoa não terminou de preencher pelo link/QR Code
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-iw-border">
            <span className="flex-1 text-xs text-iw-navy break-all">{linkContinuacao}</span>
            <button
              type="button"
              onClick={copiarLink}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-iw-navy hover:text-iw-navy"
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? "Copiado" : "Copiar link"}
            </button>
          </div>
          <p className="text-xs text-iw-muted">
            Reenvie esse link pra pessoa completar sozinha, ou abra-o você mesmo pra preencher em nome dela.
          </p>
        </div>
      )}

      {/* ── Dados pessoais + curso/vínculo — 21/09/2026, layout padronizado
          com nova/NovaMatriculaForm.tsx: cards separados por seção (em vez
          de um card único), foto ao lado do card "Curso e Vínculo", e as
          mesmas caixas com destaque dourado ao focar. ── */}
      <form action={action ?? atualizarMatriculaAction} className="space-y-6">
        <input type="hidden" name="matricula_id" value={matricula.id} />
        <input type="hidden" name="aluno_id" value={aluno.id} />

        {/* Foto do aluno + Curso e vínculo — foto à esquerda, quadro à direita */}
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {!selfService && (
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
          )}

          <div className={`${selfService ? "col-span-12" : "col-span-12 md:col-span-10"} bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3`}>
            <SectionHeader icon={GraduationCap} label="Curso e Vínculo" />
            {selfService ? (
              <>
                <p className="text-xs text-iw-muted -mt-1">
                  Preenchido automaticamente pelo link da sua turma — não dá pra alterar aqui.
                </p>
                <div className="grid grid-cols-12 gap-2.5">
                  <Field compact label="Curso" span="col-span-12 md:col-span-4">
                    <input value={matricula.curso_nome_snapshot} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                  <Field compact label="Turma" span="col-span-12 md:col-span-4">
                    <input value={turmaNomeExibicao ?? "—"} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                  <Field compact label="Professor(a)" span="col-span-12 md:col-span-4">
                    <input value={professorNomeExibicao ?? "—"} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                </div>
                <div className="grid grid-cols-12 gap-2.5">
                  <Field compact label="Campo / Ministério" span="col-span-12 md:col-span-4">
                    <input value={campoNomeExibicao ?? "—"} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                  <Field compact label="Setor" span="col-span-6 md:col-span-4">
                    <input value={setorNomeExibicao ?? "—"} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                  <Field compact label="Igreja" span="col-span-6 md:col-span-4">
                    <input value={igrejaNomeExibicao ?? "—"} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2.5">
                  <Field compact label="Curso (não editável aqui)" span="col-span-12 md:col-span-4">
                    <input value={matricula.curso_nome_snapshot} readOnly disabled className={`${bareCls} text-iw-muted`} />
                  </Field>
                  <Field compact label="Turma" span="col-span-12 md:col-span-4">
                    <select name="course_edition_id" defaultValue={matricula.course_edition_id ?? ""} className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      {turmasDoCurso.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </Field>
                  <Field compact label="Professor(a)" span="col-span-12 md:col-span-4">
                    <select name="professor_id" defaultValue={matricula.professor_id ?? ""} className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      {professores.map((p) => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-12 gap-2.5">
                  <Field compact label="Campo / Ministério" span="col-span-12 md:col-span-4">
                    <select name="campo_ministerio_id" defaultValue={resolverCampoPadraoId(campos, aluno.campo_ministerio_id)} className={bareSelectCls}>
                      <option value="">Selecione (opcional)</option>
                      {campos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </Field>
                  <Field compact label="Setor" span="col-span-6 md:col-span-4">
                    <select
                      name="sector_id"
                      value={sectorId}
                      onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
                      className={bareSelectCls}
                    >
                      <option value="">Selecione...</option>
                      {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field compact label="Igreja" span="col-span-6 md:col-span-4">
                    <select
                      name="church_id_aluno"
                      value={churchId}
                      onChange={(e) => setChurchId(e.target.value)}
                      className={bareSelectCls}
                    >
                      <option value="">Selecione...</option>
                      {igrejasDoSetor.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
          <SectionHeader icon={User} label="Dados pessoais" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome completo" required span="col-span-12 md:col-span-6">
              <input name="nome_completo" required defaultValue={aluno.nome_completo} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            {/* 21/09/2026, achado em teste (imagem 9): CPF não tinha campo
                nesta tela — ficava gravado desde a inscrição/matrícula, mas
                sem forma de conferir/corrigir aqui. Igual nome_completo/
                email, é sempre obrigatório (não só em selfService) porque
                já vem preenchido desde o primeiro cadastro mínimo (nome +
                CPF + telefone + e-mail), tanto pro aluno quanto pro
                professor. */}
            <Field label="CPF" required span="col-span-6 md:col-span-3">
              <input name="cpf" required defaultValue={aluno.cpf ?? ""} placeholder="000.000.000-00" className={bareCls} />
            </Field>
            <Field label="Data de nascimento" required={selfService} span="col-span-6 md:col-span-3">
              <input name="data_nascimento" required={selfService} type="date" defaultValue={aluno.data_nascimento ?? ""} className={bareCls} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="E-mail" required span="col-span-12 md:col-span-4">
              <input name="email" type="email" required defaultValue={aluno.email} className={bareCls} />
            </Field>
            <Field label="Telefone" required={selfService} span="col-span-12 md:col-span-3">
              <input name="telefone" required={selfService} defaultValue={aluno.telefone ?? ""} placeholder="(00) 00000-0000" className={bareCls} />
            </Field>
            {/* 22/09/2026, pedido do Joaquim: RG (número) deixou de ser obrigatório
                em qualquer formulário — o novo documento de identidade unificado
                não traz mais esse número. Órgão emissor/UF do RG abaixo continuam
                como estavam (só fazem sentido se a pessoa tiver um RG antigo). */}
            <Field label="RG" span="col-span-6 md:col-span-2">
              <input name="rg" defaultValue={aluno.rg ?? ""} className={bareCls} />
            </Field>
            <Field label="Órgão" required={selfService} span="col-span-6 md:col-span-1">
              <input name="rg_orgao_emissor" required={selfService} defaultValue={aluno.rg_orgao_emissor ?? "SSP"} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="UF do RG" required={selfService} span="col-span-6 md:col-span-2">
              <input name="rg_uf" required={selfService} maxLength={2} defaultValue={aluno.rg_uf ?? "SP"} className={`${bareCls} uppercase`} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Sexo" required={selfService} span="col-span-6 md:col-span-3">
              <select name="genero" required={selfService} defaultValue={aluno.genero ?? ""} className={bareSelectCls}>
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </Field>
            <Field label="Estado civil" required={selfService} span="col-span-6 md:col-span-3">
              <select name="estado_civil" required={selfService} defaultValue={aluno.estado_civil ?? ""} className={bareSelectCls}>
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
              </select>
            </Field>
            <Field label="Escolaridade" required={selfService} span="col-span-6 md:col-span-3">
              <BuscaOuCriarInput
                name="escolaridade"
                required={selfService}
                defaultValue={aluno.escolaridade ?? ""}
                itens={escolaridades.map((e) => ({ id: e.id, label: e.name }))}
                placeholder="Digite pra buscar"
                permitirLivre
                className={`${bareCls} cursor-pointer uppercase`}
              />
            </Field>
            <Field label="Profissão" span="col-span-6 md:col-span-3">
              <BuscaOuCriarInput
                name="profissao"
                defaultValue={aluno.profissao ?? ""}
                itens={profissoes.map((p) => ({ id: p.id, label: p.name }))}
                placeholder="Digite pra buscar"
                permitirLivre
                className={`${bareCls} cursor-pointer uppercase`}
              />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <CampoNaturalidadeCidade
              span="col-span-6 md:col-span-2"
              required={selfService}
              valor={naturalidadeCidade}
              municipios={municipios}
              onSelecionar={(nome, uf) => { setNaturalidadeCidade(nome); setNaturalidadeEstado(uf); }}
            />
            <Field label="UF" required={selfService} span="col-span-3 md:col-span-1">
              <input
                name="naturalidade_estado"
                required={selfService}
                maxLength={2}
                value={naturalidadeEstado}
                onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase`}
              />
            </Field>
            <Field label="Nacionalidade" required={selfService} span="col-span-3 md:col-span-2">
              <input name="nacionalidade" required={selfService} defaultValue={aluno.nacionalidade ?? "Brasileira"} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-7">
              <input name="nome_conjuge" defaultValue={aluno.nome_conjuge ?? ""} autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome da mãe" required={selfService} span="col-span-12 md:col-span-6">
              <input name="nome_mae" required={selfService} defaultValue={aluno.nome_mae ?? ""} autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="Nome do pai" span="col-span-12 md:col-span-6">
              <input name="nome_pai" defaultValue={aluno.nome_pai ?? ""} autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
          </div>
        </div>

        {/* Endereço — 21/09/2026, achado em teste (imagem 10): os spans
            somavam mais de 12 colunas e quebravam feio; agora em 2 linhas
            iguais à Nova Matrícula. */}
        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
          <SectionHeader icon={MapPin} label="Endereço" />
          <div className="grid grid-cols-12 gap-3">
            <Field label={loadingCep ? "CEP (buscando...)" : "CEP"} required={selfService} span="col-span-6 md:col-span-2">
              <input
                name="cep"
                required={selfService}
                defaultValue={aluno.cep ?? ""}
                onBlur={(e) => handleBlurCep(e.target.value)}
                className={bareCls}
              />
            </Field>
            <Field label="Endereço" required={selfService} span="col-span-12 md:col-span-7">
              <input ref={enderecoRef} name="endereco" required={selfService} defaultValue={aluno.endereco ?? ""} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="Número" required={selfService} span="col-span-6 md:col-span-3">
              <input name="endereco_numero" required={selfService} defaultValue={aluno.endereco_numero ?? ""} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Complemento" span="col-span-12 md:col-span-4">
              <input name="endereco_complemento" defaultValue={aluno.endereco_complemento ?? ""} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="Bairro" required={selfService} span="col-span-12 md:col-span-4">
              <input ref={bairroRef} name="bairro" required={selfService} defaultValue={aluno.bairro ?? ""} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="Cidade" required={selfService} span="col-span-6 md:col-span-3">
              <input ref={cidadeRef} name="cidade" required={selfService} defaultValue={aluno.cidade ?? ""} onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
            </Field>
            <Field label="UF" required={selfService} span="col-span-6 md:col-span-1">
              <input ref={estadoRef} name="estado" required={selfService} maxLength={2} defaultValue={aluno.estado ?? ""} className={`${bareCls} uppercase`} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton
            label={selfService ? "Concluir cadastro" : "Salvar alterações"}
            pendingLabel="Salvando..."
          />
        </div>
      </form>

      {/* ── Pagamentos ── */}
      {!selfService && (
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <SectionHeader icon={Wallet} label="Pagamentos" />

        {!temMensalidadeLancada && (
          <form
            action={gerarParcelasMensalidadeAction}
            className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
          >
            <input type="hidden" name="matricula_id" value={matricula.id} />
            <input type="hidden" name="aluno_id" value={aluno.id} />
            <p className="text-xs text-amber-800">
              Esta matrícula ainda não tem mensalidade lançada — só a matrícula (se houver), sem as
              parcelas mensais do curso.
            </p>
            <button
              type="submit"
              className="shrink-0 inline-flex items-center gap-1.5 bg-iw-navy hover:opacity-90 text-white font-bold text-xs px-3 py-2 rounded-xl transition-opacity"
            >
              <Wallet className="w-3.5 h-3.5" />
              Gerar parcelas de mensalidade
            </button>
          </form>
        )}

        {pagamentos.length > 0 ? (
          <div className="flex flex-col gap-2">
            {pagamentos.map((p) => {
              const statusEfetivo = statusEfetivoPagamento(p);
              const podeBaixar = statusEfetivo === "PENDENTE" || statusEfetivo === "ATRASADO" || statusEfetivo === "EM_DIA";
              return (
                <div key={p.id} className="bg-iw-bg rounded-xl px-4 py-3 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <History className="w-3.5 h-3.5 text-iw-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-iw-navy font-medium truncate">{p.descricao}</p>
                        <p className="text-xs text-iw-muted">
                          {p.numero_parcela}/{p.total_parcelas} · {p.forma_pagamento_prevista} ·{" "}
                          {p.status === "PAGO" ? `pago em ${formatarDataBr(p.pago_em)}` : `vence em ${formatarDataBr(p.data_vencimento)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-iw-navy">{formatarCentavos(p.valor_bruto_centavos)}</span>
                      <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${PAGAMENTO_STATUS_STYLE[statusEfetivo] ?? PAGAMENTO_STATUS_STYLE.PENDENTE}`}>
                        {statusEfetivo.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {podeBaixar && (
                    <details className="group">
                      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy hover:opacity-80">
                        <Check className="w-3.5 h-3.5" />
                        Dar baixa / cancelar
                      </summary>
                      <div className="mt-3 space-y-3 bg-white rounded-xl p-4 border border-iw-gold">
                        <form action={baixarParcelaAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="caixa_diario_id" value={caixaAbertoId} />
                          <select
                            name="forma_pagamento"
                            defaultValue={p.forma_pagamento_prevista}
                            className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                          >
                            <option value="DINHEIRO" disabled={!caixaAbertoId}>
                              Dinheiro {!caixaAbertoId ? "(abra o caixa)" : ""}
                            </option>
                            <option value="PIX">Pix</option>
                            <option value="DEBITO">Débito</option>
                            <option value="CREDITO">Crédito</option>
                            <option value="BOLETO">Boleto</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                          </select>
                          <input
                            name="taxa_operadora"
                            placeholder="% taxa operadora"
                            className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                          />
                          <input
                            name="taxa_antecipacao"
                            placeholder="% antecipação"
                            className="sm:col-span-2 bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-sm focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors"
                          />
                          <button
                            type="submit"
                            className="sm:col-span-6 justify-self-start bg-iw-success hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-opacity"
                          >
                            Confirmar recebimento
                          </button>
                        </form>
                        <p className="text-[11px] text-iw-muted">
                          Dinheiro/Pix entram pelo valor cheio. Em cartão, informe % da operadora e % de antecipação
                          (se houver) — isso lança o recebimento como movimento financeiro em Financeiro, sem alterar
                          o Caixa Diário além do previsto.
                        </p>
                        <form action={cancelarParcelaAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-error hover:opacity-80"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cancelar parcela
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-iw-muted">Nenhum pagamento registrado ainda.</p>
        )}

        {!mostrarPagamento ? (
          <button
            type="button"
            onClick={() => setMostrarPagamento(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-iw-bg text-iw-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-iw-border"
          >
            <Wallet className="w-4 h-4" />
            Lançar pagamento retroativo
          </button>
        ) : (
          <form action={lancarPagamentoRetroativoAction} className="bg-iw-bg rounded-xl p-4 space-y-3">
            <input type="hidden" name="matricula_id" value={matricula.id} />
            <input type="hidden" name="aluno_id" value={aluno.id} />
            <p className="text-xs text-iw-muted">
              Pra regularização — entra direto como <strong>pago</strong>, na data em que a pessoa realmente pagou.
              Não gera cobrança pendente.
            </p>
            <div className="grid grid-cols-12 gap-3">
              <Field label="Valor total pago" required span="col-span-6 md:col-span-3">
                <input name="valor_total" required placeholder="Ex: 600,00" className={bareCls} />
              </Field>
              <Field label="Parcelas (já quitadas)" span="col-span-6 md:col-span-3">
                <input name="total_parcelas" type="number" min={1} max={12} defaultValue={1} className={bareCls} />
              </Field>
              <Field label="Data original do pagamento" required span="col-span-6 md:col-span-3">
                <input name="data_pagamento" type="date" required className={bareCls} />
              </Field>
              <Field label="Forma de pagamento" span="col-span-6 md:col-span-3">
                <select name="forma_pagamento_prevista" defaultValue="DINHEIRO" className={bareSelectCls}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                </select>
              </Field>
              <Field label="Quem pagou" span="col-span-6 md:col-span-3">
                <select name="responsavel_pagamento" defaultValue="ALUNO" className={bareSelectCls}>
                  <option value="ALUNO">O próprio aluno</option>
                  <option value="IGREJA">Igreja</option>
                </select>
              </Field>
              <Field label="Observações (opcional)" span="col-span-12 md:col-span-6">
                <input name="observacoes" placeholder="Ex: pago direto na secretaria antes do sistema" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
              </Field>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <SubmitButton label="Lançar pagamento" pendingLabel="Lançando..." />
              <button
                type="button"
                onClick={() => setMostrarPagamento(false)}
                className="text-xs font-bold text-iw-muted hover:text-iw-navy px-3 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* ── Cancelar matrícula ── */}
      {!selfService && (
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <SectionHeader icon={Ban} label="Cancelar matrícula" />
        <p className="text-xs text-iw-muted">
          Não apaga o cadastro nem o histórico — só marca a matrícula como cancelada (fica registrada, pra
          auditoria/inventário).
        </p>
        {!confirmarCancelar ? (
          <button
            type="button"
            onClick={() => setConfirmarCancelar(true)}
            disabled={matricula.status === "CANCELADO"}
            className="inline-flex items-center gap-2 bg-white hover:bg-iw-error-bg disabled:opacity-50 text-iw-error font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-iw-error/30"
          >
            <Ban className="w-4 h-4" />
            {matricula.status === "CANCELADO" ? "Já cancelada" : "Cancelar esta matrícula"}
          </button>
        ) : (
          <form action={cancelarMatriculaAction} className="flex items-center gap-3">
            <input type="hidden" name="matricula_id" value={matricula.id} />
            <span className="text-sm text-iw-navy font-medium">Confirma o cancelamento?</span>
            <button
              type="submit"
              className="bg-iw-error hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity"
            >
              Sim, cancelar
            </button>
            <button
              type="button"
              onClick={() => setConfirmarCancelar(false)}
              className="text-xs font-bold text-iw-muted hover:text-iw-navy px-3 py-2"
            >
              Voltar
            </button>
          </form>
        )}
      </div>
      )}
    </div>
  );
}
