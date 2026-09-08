"use client";

import { useMemo, useState, useTransition } from "react";
import { Send, Loader2, AlertTriangle, QrCode, Copy, Check, UserPlus, Mail, CheckCircle2, Wallet, ExternalLink } from "lucide-react";
import { validarCPF } from "@/utils/cpf";
import PageHeader from "@/components/layout/PageHeader";
import { criarFichaPendenteAction, enviarLinkFichaEmailAction } from "./actions";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type Curso = { id: string; title: string; module: string };
type SelectItem = { id: string; name: string };
type Church = { id: string; name: string; sector_id: string | null };
type Turma = { id: string; nome: string; course_id: string };
type Professor = { id: string; nome_completo: string; church_id: string | null };
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

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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

// O destaque forte (borda + fundo dourados) segue o campo com foco — ou
// seja, o PRÓXIMO campo a preencher — via :focus-within, aplicado pelo
// navegador sozinho assim que o campo recebe foco. Campo já preenchido,
// sem foco, fica neutro e ganha só um ícone de check ao lado do rótulo.
const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxFilledCls =
  "border border-iw-gold/40 rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

// Depois que a pessoa escolhe uma opção num <select>, pula sozinho pro
// próximo campo preenchível do formulário — evita ter que tocar duas
// vezes (uma pra escolher, outra pra sair do campo) em cada seleção.
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

function Field({
  label, required, span, filled, children,
}: {
  label: string; required?: boolean; span?: string; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`${filled ? boxFilledCls : boxCls} ${span ?? "col-span-12 md:col-span-3"}`}>
      <div className="flex items-center justify-between gap-1">
        <label className={boxLabelCls}>{label}{required && " *"}</label>
        {filled && <Check className="w-3 h-3 text-iw-gold shrink-0" aria-hidden="true" />}
      </div>
      {children}
    </div>
  );
}

interface ResultadoFicha {
  alunoId: string;
  matricula: string;
  nomeCompleto: string;
  url: string;
  qrCodeDataUrl: string | null;
  linkPagamento?: string | null;
}

type EstadoEnvioEmail = "idle" | "enviando" | "enviado" | "erro";

export default function FichaRapidaForm({
  campos, cursos, churches, setores, turmas, professores, precos,
}: {
  campos: CampoMinisterio[];
  cursos: Curso[];
  churches: Church[];
  setores: SelectItem[];
  turmas: Turma[];
  professores: Professor[];
  precos: Preco[];
}) {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailAluno, setEmailAluno] = useState("");
  const [courseId, setCourseId] = useState("");
  const [campoMinisterioId, setCampoMinisterioId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [professorId, setProfessorId] = useState("");
  // Pagamento — preenchido sozinho ao escolher o curso (Financeiro > Preços
  // dos Cursos), com opção de sobrescrever pontualmente.
  const [valorMatricula, setValorMatricula] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [numeroParcelasPagto, setNumeroParcelasPagto] = useState("12");
  const [formaCobranca, setFormaCobranca] = useState("MERCADOPAGO");
  const [responsavelPagamento, setResponsavelPagamento] = useState("ALUNO");
  const [churchIdPagamento, setChurchIdPagamento] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoFicha | null>(null);
  const [reaproveitada, setReaproveitada] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [emailEnvio, setEmailEnvio] = useState("");
  const [estadoEmail, setEstadoEmail] = useState<EstadoEnvioEmail>("idle");
  const [mensagemEmail, setMensagemEmail] = useState("");
  const [isPendingEmail, startTransitionEmail] = useTransition();

  const cursosEscola = cursos.filter((c) => c.module === "escola");
  const cursosOutros = cursos.filter((c) => c.module !== "escola");
  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );
  const turmasDoCurso = useMemo(
    () => (courseId ? turmas.filter((t) => t.course_id === courseId) : []),
    [courseId, turmas]
  );

  const handleSubmit = (fd: FormData) => {
    if (!validarCPF(cpf)) {
      setErro("CPF inválido — confira os dígitos digitados.");
      return;
    }
    setErro("");
    fd.set("cpf", cpf);
    fd.set("telefone", telefone);
    fd.set("email", emailAluno);
    fd.set("sector_id", sectorId);
    fd.set("church_id_aluno", churchId);
    fd.set("course_edition_id", turmaId);
    fd.set("professor_id", professorId);
    // A action lê "campo_ministerio_nome" (pro PDF/telas que só mostram o
    // nome) além do id — sem isso, o nome ficava sempre em branco.
    const campoSelecionado = campos.find((c) => c.id === campoMinisterioId);
    fd.set("campo_ministerio_nome", campoSelecionado?.nome ?? "");
    fd.set("valor_matricula", valorMatricula);
    fd.set("valor_parcela", valorParcela);
    fd.set("total_parcelas", numeroParcelasPagto);
    fd.set("forma_cobranca", formaCobranca);
    fd.set("responsavel_pagamento", responsavelPagamento);
    fd.set("church_id", responsavelPagamento === "IGREJA" ? churchIdPagamento : churchId);
    startTransition(async () => {
      const res = await criarFichaPendenteAction(fd);
      if (!res.success || !res.data) {
        setErro(res.message ?? "Erro ao gerar ficha.");
        return;
      }
      setReaproveitada(Boolean((res as { reaproveitada?: boolean }).reaproveitada));
      setEstadoEmail("idle");
      setMensagemEmail("");
      // Se a secretaria já digitou o e-mail no formulário, aproveita aqui —
      // não precisa redigitar na tela de resultado pra mandar o link.
      setEmailEnvio(emailAluno);
      setResultado(res.data as ResultadoFicha);
    });
  };

  const handleEnviarEmail = () => {
    if (!resultado) return;
    if (!emailEnvio.includes("@")) {
      setEstadoEmail("erro");
      setMensagemEmail("Informe um e-mail válido.");
      return;
    }
    setEstadoEmail("enviando");
    setMensagemEmail("");
    startTransitionEmail(async () => {
      const res = await enviarLinkFichaEmailAction(resultado.alunoId, emailEnvio);
      setEstadoEmail(res.success ? "enviado" : "erro");
      setMensagemEmail(res.message ?? "");
    });
  };

  const handleCopiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — o link já está visível na tela pra copiar manualmente
    }
  };

  if (resultado) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-16 px-2">
        <PageHeader
          title="Ficha criada"
          description={`Matrícula ${resultado.matricula} — ${resultado.nomeCompleto}`}
          backHref="/admin/matriculas"
          backLabel="Voltar para Matrículas"
        />
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4 text-center">
          {resultado.linkPagamento && (
            <div className="flex flex-col items-center gap-2 bg-iw-gold/10 border border-iw-gold/30 text-iw-navy px-3 py-3 rounded-xl text-xs text-left">
              <div className="flex items-center gap-2 font-bold">
                <Wallet className="w-4 h-4 shrink-0" /> Link de pagamento (Pix / Mercado Pago) gerado
              </div>
              <div className="flex items-center gap-2 w-full bg-white rounded-lg px-3 py-2">
                <span className="flex-1 break-all">{resultado.linkPagamento}</span>
                <a
                  href={resultado.linkPagamento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 font-bold text-iw-blue hover:text-iw-navy"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir
                </a>
              </div>
            </div>
          )}
          {reaproveitada && (
            <div className="flex items-center gap-2 bg-iw-gold/10 border border-iw-gold/30 text-iw-navy px-3 py-2 rounded-xl text-xs text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Este aluno já tinha uma ficha pendente para este curso — o cadastro ainda não foi
                completado, então aqui está o mesmo link/QR Code de novo (não foi criada uma segunda matrícula).
              </span>
            </div>
          )}
          <p className="text-sm text-iw-navy">
            Mostre este QR Code pro aluno escanear com o celular — ele completa o próprio cadastro
            (endereço, RG, mãe/pai, foto) sem precisar da secretaria digitar tudo.
          </p>
          {resultado.qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultado.qrCodeDataUrl}
              alt={`QR Code de confirmação de cadastro — matrícula ${resultado.matricula}`}
              className="mx-auto w-64 h-64 border border-iw-border rounded-xl"
            />
          )}
          <div className="flex items-center gap-2 bg-iw-bg rounded-xl px-3 py-2 text-left">
            <span className="flex-1 text-xs text-iw-navy break-all">{resultado.url}</span>
            <button
              type="button"
              onClick={handleCopiar}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-iw-blue hover:text-iw-navy"
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? "Copiado" : "Copiar link"}
            </button>
          </div>

          <div className="bg-iw-bg rounded-xl px-3 py-3 text-left space-y-2">
            <label className="block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">
              Ou enviar o link por e-mail (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailEnvio}
                onChange={(e) => { setEmailEnvio(e.target.value); setEstadoEmail("idle"); setMensagemEmail(""); }}
                placeholder="email@exemplo.com"
                className="flex-1 bg-white border border-iw-border rounded-lg px-3 py-2 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-1 focus:ring-iw-gold/30 focus:border-iw-gold"
              />
              <button
                type="button"
                onClick={handleEnviarEmail}
                disabled={isPendingEmail}
                className="shrink-0 inline-flex items-center gap-1.5 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-opacity"
              >
                {estadoEmail === "enviando" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : estadoEmail === "enviado" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                Enviar
              </button>
            </div>
            {mensagemEmail && (
              <p className={`text-xs ${estadoEmail === "enviado" ? "text-green-700" : "text-iw-error"}`}>
                {mensagemEmail}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setResultado(null)}
            className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity border border-black"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar outro aluno
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 px-2">
      <PageHeader
        title="Ficha Rápida — Matrícula por QR Code"
        description="Cadastro mínimo a partir da ficha de papel — o resto (endereço, foto, dados pessoais) o aluno completa sozinho pelo celular."
        backHref="/admin/matriculas"
        backLabel="Voltar para Matrículas"
      />

      {/* Wrapper sempre montado — evita remontar o <form> (e perder os
          campos já preenchidos) quando o banner de erro aparece/some. */}
      <div>
        {erro && (
          <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{erro}</span>
          </div>
        )}
      </div>

      <form action={handleSubmit} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Nome completo" required span="col-span-12 md:col-span-5" filled={nomeCompleto.length > 0}>
            <input
              name="nome_completo"
              required
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value.toUpperCase())}
              placeholder="Nome completo do aluno"
              className={`${bareCls} uppercase`}
            />
          </Field>
          <Field label="CPF" required span="col-span-6 md:col-span-3" filled={cpf.length > 0}>
            <input
              required
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              className={bareCls}
            />
          </Field>
          <Field label="Telefone" span="col-span-6 md:col-span-2" filled={telefone.length > 0}>
            <input
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={bareCls}
            />
          </Field>
          <Field label="E-mail (opcional)" span="col-span-12 md:col-span-2" filled={emailAluno.length > 0}>
            <input
              type="email"
              value={emailAluno}
              onChange={(e) => setEmailAluno(e.target.value)}
              placeholder="email@exemplo.com"
              className={bareCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Curso" required span="col-span-12 md:col-span-4" filled={courseId.length > 0}>
            <select
              name="course_id"
              required
              value={courseId}
              onChange={(e) => {
                const novoCursoId = e.target.value;
                setCourseId(novoCursoId);
                setTurmaId("");
                const preco = precos.find((p) => p.course_id === novoCursoId);
                setValorMatricula(preco ? centavosParaTexto(preco.valor_matricula_centavos) : "");
                setValorParcela(preco ? centavosParaTexto(preco.valor_parcela_centavos) : "");
                setNumeroParcelasPagto(preco ? String(preco.numero_parcelas) : "12");
                focarProximoCampo(e.currentTarget);
              }}
              className={bareSelectCls}
            >
              <option value="" disabled>Selecione o curso</option>
              {cursosEscola.length > 0 && (
                <optgroup label="Escola Teológica">
                  {cursosEscola.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </optgroup>
              )}
              {cursosOutros.length > 0 && (
                <optgroup label="Cursos & Preparatórios">
                  {cursosOutros.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="Campo / Ministério" span="col-span-12 md:col-span-4" filled={campoMinisterioId.length > 0}>
            <select
              name="campo_ministerio_id"
              value={campoMinisterioId}
              onChange={(e) => { setCampoMinisterioId(e.target.value); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">Selecione (opcional)</option>
              {campos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Setor" span="col-span-6 md:col-span-2" filled={sectorId.length > 0}>
            <select
              value={sectorId}
              onChange={(e) => { setSectorId(e.target.value); setChurchId(""); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">Selecione...</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Igreja" span="col-span-6 md:col-span-2" filled={churchId.length > 0}>
            <select
              value={churchId}
              onChange={(e) => { setChurchId(e.target.value); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">Selecione...</option>
              {igrejasDoSetor.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Turma (opcional)" span="col-span-6" filled={turmaId.length > 0}>
            <select
              value={turmaId}
              onChange={(e) => { setTurmaId(e.target.value); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">{courseId ? "Selecione..." : "Selecione o curso primeiro"}</option>
              {turmasDoCurso.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Professor(a) (opcional)" span="col-span-6" filled={professorId.length > 0}>
            <select
              value={professorId}
              onChange={(e) => { setProfessorId(e.target.value); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">Selecione...</option>
              {professores.map((p) => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
            </select>
          </Field>
        </div>

        <div className="border-t border-iw-border pt-3 space-y-3">
          <div className="flex items-center gap-2 text-iw-navy font-bold text-xs uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5 text-iw-gold" /> Pagamento (opcional)
          </div>
          <p className="text-xs text-iw-muted -mt-1">
            Preenchido automaticamente ao escolher o curso (valor fixo em Financeiro &gt; Preços dos Cursos) — pode
            sobrescrever pontualmente aqui. Deixe em branco se não houver cobrança agora.
          </p>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Valor da matrícula (opcional)" span="col-span-6 md:col-span-3">
              <input
                value={valorMatricula}
                onChange={(e) => setValorMatricula(e.target.value)}
                placeholder="Ex: 25,00"
                className={bareCls}
              />
            </Field>
            <Field label="Valor da parcela" span="col-span-6 md:col-span-3">
              <input
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
                placeholder="Ex: 65,00"
                className={bareCls}
              />
            </Field>
            <Field label="Nº de parcelas" span="col-span-6 md:col-span-2">
              <input
                type="number"
                min={1}
                max={12}
                value={numeroParcelasPagto}
                onChange={(e) => setNumeroParcelasPagto(e.target.value)}
                className={bareCls}
              />
            </Field>
            <Field label="Forma de cobrança" span="col-span-6 md:col-span-4">
              <select
                value={formaCobranca}
                onChange={(e) => setFormaCobranca(e.target.value)}
                className={bareSelectCls}
              >
                <option value="MERCADOPAGO">Link Pix / Mercado Pago</option>
                <option value="MANUAL">Parcelamento manual (Contas a Receber)</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Quem paga" span="col-span-6 md:col-span-4">
              <select
                value={responsavelPagamento}
                onChange={(e) => setResponsavelPagamento(e.target.value)}
                className={bareSelectCls}
              >
                <option value="ALUNO">O próprio aluno</option>
                <option value="IGREJA">Igreja (financiamento interno)</option>
              </select>
            </Field>
            {responsavelPagamento === "IGREJA" && (
              <Field label="Igreja responsável" span="col-span-6 md:col-span-4">
                <select
                  value={churchIdPagamento}
                  onChange={(e) => setChurchIdPagamento(e.target.value)}
                  className={bareSelectCls}
                >
                  <option value="">Selecione...</option>
                  {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
          </div>
          {formaCobranca === "MERCADOPAGO" && (
            <p className="text-xs text-iw-muted">
              Um link de pagamento único Pix/Mercado Pago será gerado no valor total (matrícula + parcelas) e
              mostrado na próxima tela, pronto pra copiar ou enviar pro aluno.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity border border-black"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            ) : (
              <><QrCode className="w-4 h-4" /> <Send className="w-4 h-4" /> Gerar matrícula + QR Code</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
