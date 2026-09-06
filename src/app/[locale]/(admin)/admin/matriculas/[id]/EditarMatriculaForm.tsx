"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Send, Loader2, AlertTriangle, CheckCircle2, User, GraduationCap, Wallet, QrCode, Copy, Check, Ban, History, Camera,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import PageHeader from "@/components/layout/PageHeader";
import {
  atualizarMatriculaAction, lancarPagamentoRetroativoAction, cancelarMatriculaAction,
} from "../actions";
import { baixarParcelaAction, cancelarParcelaAction } from "../../financeiro/actions";

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

function statusEfetivoPagamento(p: Pagamento): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return p.status === "PENDENTE" && p.data_vencimento < hoje ? "ATRASADO" : p.status;
}

const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({
  label, required, span, children,
}: {
  label: string; required?: boolean; span?: string; children: React.ReactNode;
}) {
  return (
    <div className={`${boxCls} ${span ?? "col-span-12 md:col-span-3"}`}>
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
  PENDENTE: "bg-iw-blue/10 text-iw-blue border-iw-blue/30",
  ATRASADO: "bg-iw-error-bg text-iw-error border-iw-error/30",
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
  matricula, aluno, campos, churches, setores, turmas, professores, pagamentos, caixaAbertoId, errorMsg, successMsg,
}: {
  matricula: Matricula;
  aluno: Aluno;
  campos: CampoMinisterio[];
  churches: Church[];
  setores: SelectItem[];
  turmas: Turma[];
  professores: Professor[];
  pagamentos: Pagamento[];
  caixaAbertoId: string;
  errorMsg?: string;
  successMsg?: string;
}) {
  const [sectorId, setSectorId] = useState(aluno.sector_id ?? "");
  const [churchId, setChurchId] = useState(aluno.church_id ?? "");
  const [copiado, setCopiado] = useState(false);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [fotoUrl, setFotoUrl] = useState(aluno.foto_url ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);

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
    <div className="max-w-5xl mx-auto space-y-6 pb-16 px-2">
      <PageHeader
        icon={GraduationCap}
        title={`Editar matrícula — ${matricula.matricula}`}
        description={`${aluno.nome_completo} — ${matricula.curso_nome_snapshot}`}
        backHref="/admin/matriculas"
        backLabel="Voltar para Matrículas"
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

      {aluno.status === "FICHA_PENDENTE" && (
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
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-iw-blue hover:text-iw-navy"
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

      {/* ── Dados pessoais + curso/vínculo ── */}
      <form action={atualizarMatriculaAction} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-6">
        <input type="hidden" name="matricula_id" value={matricula.id} />
        <input type="hidden" name="aluno_id" value={aluno.id} />

        <SectionHeader icon={User} label="Dados pessoais" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-iw-bg border-2 border-dashed border-iw-border flex items-center justify-center relative overflow-hidden shrink-0 group hover:border-iw-gold transition-colors">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="Foto do aluno" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-iw-muted group-hover:text-iw-gold">
                {uploadingFoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <div className="text-xs text-iw-muted">
            <p className="font-bold text-iw-navy">{fotoUrl ? "Foto do aluno" : "Sem foto — clique no círculo pra adicionar"}</p>
            <p>Aparece na ficha e no PDF de matrícula.</p>
          </div>
          <input type="hidden" name="foto_url" value={fotoUrl} />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Nome completo" required span="col-span-12 md:col-span-6">
            <input name="nome_completo" required defaultValue={aluno.nome_completo} className={bareCls} />
          </Field>
          <Field label="E-mail" required span="col-span-12 md:col-span-3">
            <input name="email" type="email" required defaultValue={aluno.email} className={bareCls} />
          </Field>
          <Field label="Telefone" span="col-span-12 md:col-span-3">
            <input name="telefone" defaultValue={aluno.telefone ?? ""} placeholder="(00) 00000-0000" className={bareCls} />
          </Field>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Field label="RG" span="col-span-6 md:col-span-2">
            <input name="rg" defaultValue={aluno.rg ?? ""} className={bareCls} />
          </Field>
          <Field label="Órgão" span="col-span-6 md:col-span-2">
            <input name="rg_orgao_emissor" defaultValue={aluno.rg_orgao_emissor ?? "SSP"} className={bareCls} />
          </Field>
          <Field label="UF do RG" span="col-span-6 md:col-span-2">
            <input name="rg_uf" maxLength={2} defaultValue={aluno.rg_uf ?? "SP"} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Data de nascimento" span="col-span-6 md:col-span-2">
            <input name="data_nascimento" type="date" defaultValue={aluno.data_nascimento ?? ""} className={bareCls} />
          </Field>
          <Field label="Sexo" span="col-span-6 md:col-span-2">
            <select name="genero" defaultValue={aluno.genero ?? ""} className={bareSelectCls}>
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="Estado civil" span="col-span-6 md:col-span-2">
            <select name="estado_civil" defaultValue={aluno.estado_civil ?? ""} className={bareSelectCls}>
              <option value="">Selecione...</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Escolaridade" span="col-span-6 md:col-span-3">
            <input name="escolaridade" defaultValue={aluno.escolaridade ?? ""} className={bareCls} />
          </Field>
          <Field label="Profissão" span="col-span-6 md:col-span-3">
            <input name="profissao" defaultValue={aluno.profissao ?? ""} className={bareCls} />
          </Field>
          <Field label="Naturalidade — cidade" span="col-span-6 md:col-span-3">
            <input name="naturalidade_cidade" defaultValue={aluno.naturalidade_cidade ?? ""} className={bareCls} />
          </Field>
          <Field label="UF" span="col-span-3 md:col-span-1">
            <input name="naturalidade_estado" maxLength={2} defaultValue={aluno.naturalidade_estado ?? ""} className={`${bareCls} uppercase`} />
          </Field>
          <Field label="Nacionalidade" span="col-span-3 md:col-span-2">
            <input name="nacionalidade" defaultValue={aluno.nacionalidade ?? "Brasileira"} className={bareCls} />
          </Field>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-4">
            <input name="nome_conjuge" defaultValue={aluno.nome_conjuge ?? ""} autoComplete="off" className={bareCls} />
          </Field>
          <Field label="Nome da mãe" span="col-span-12 md:col-span-4">
            <input name="nome_mae" defaultValue={aluno.nome_mae ?? ""} autoComplete="off" className={bareCls} />
          </Field>
          <Field label="Nome do pai" span="col-span-12 md:col-span-4">
            <input name="nome_pai" defaultValue={aluno.nome_pai ?? ""} autoComplete="off" className={bareCls} />
          </Field>
        </div>

        <SectionHeader icon={GraduationCap} label="Endereço" />
        <div className="grid grid-cols-12 gap-3">
          <Field label="CEP" span="col-span-6 md:col-span-2">
            <input name="cep" defaultValue={aluno.cep ?? ""} className={bareCls} />
          </Field>
          <Field label="Endereço" span="col-span-12 md:col-span-4">
            <input name="endereco" defaultValue={aluno.endereco ?? ""} className={bareCls} />
          </Field>
          <Field label="Número" span="col-span-6 md:col-span-2">
            <input name="endereco_numero" defaultValue={aluno.endereco_numero ?? ""} className={bareCls} />
          </Field>
          <Field label="Complemento" span="col-span-6 md:col-span-2">
            <input name="endereco_complemento" defaultValue={aluno.endereco_complemento ?? ""} className={bareCls} />
          </Field>
          <Field label="Bairro" span="col-span-6 md:col-span-2">
            <input name="bairro" defaultValue={aluno.bairro ?? ""} className={bareCls} />
          </Field>
          <Field label="Cidade" span="col-span-6 md:col-span-2">
            <input name="cidade" defaultValue={aluno.cidade ?? ""} className={bareCls} />
          </Field>
          <Field label="UF" span="col-span-6 md:col-span-2">
            <input name="estado" maxLength={2} defaultValue={aluno.estado ?? ""} className={`${bareCls} uppercase`} />
          </Field>
        </div>

        <SectionHeader icon={GraduationCap} label="Curso e vínculo" />
        <div className="grid grid-cols-12 gap-3">
          <Field label="Curso (não editável aqui)" span="col-span-12 md:col-span-4">
            <input value={matricula.curso_nome_snapshot} readOnly disabled className={`${bareCls} text-iw-muted`} />
          </Field>
          <Field label="Turma" span="col-span-12 md:col-span-4">
            <select name="course_edition_id" defaultValue={matricula.course_edition_id ?? ""} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {turmasDoCurso.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Professor(a)" span="col-span-12 md:col-span-4">
            <select name="professor_id" defaultValue={matricula.professor_id ?? ""} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {professores.map((p) => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Campo / Ministério" span="col-span-12 md:col-span-4">
            <select name="campo_ministerio_id" defaultValue={aluno.campo_ministerio_id ?? ""} className={bareSelectCls}>
              <option value="">Selecione (opcional)</option>
              {campos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Setor" span="col-span-6 md:col-span-4">
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
          <Field label="Igreja" span="col-span-6 md:col-span-4">
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

        <div className="flex justify-end pt-2">
          <SubmitButton label="Salvar alterações" pendingLabel="Salvando..." />
        </div>
      </form>

      {/* ── Pagamentos ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <SectionHeader icon={Wallet} label="Pagamentos" />

        {pagamentos.length > 0 ? (
          <div className="flex flex-col gap-2">
            {pagamentos.map((p) => {
              const statusEfetivo = statusEfetivoPagamento(p);
              const podeBaixar = statusEfetivo === "PENDENTE" || statusEfetivo === "ATRASADO";
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
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${PAGAMENTO_STATUS_STYLE[statusEfetivo] ?? PAGAMENTO_STATUS_STYLE.PENDENTE}`}>
                        {statusEfetivo}
                      </span>
                    </div>
                  </div>

                  {podeBaixar && (
                    <details className="group">
                      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs font-bold text-iw-blue hover:opacity-80">
                        <Check className="w-3.5 h-3.5" />
                        Dar baixa / cancelar
                      </summary>
                      <div className="mt-3 space-y-3 bg-white rounded-xl p-4 border border-iw-border">
                        <form action={baixarParcelaAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="caixa_diario_id" value={caixaAbertoId} />
                          <select
                            name="forma_pagamento"
                            defaultValue={p.forma_pagamento_prevista}
                            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm cursor-pointer"
                          >
                            <option value="DINHEIRO" disabled={!caixaAbertoId}>
                              Dinheiro {!caixaAbertoId ? "(abra o caixa)" : ""}
                            </option>
                            <option value="PIX">Pix</option>
                            <option value="CARTAO">Cartão</option>
                            <option value="BOLETO">Boleto</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                          </select>
                          <input
                            name="taxa_operadora"
                            placeholder="% taxa operadora"
                            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm"
                          />
                          <input
                            name="taxa_antecipacao"
                            placeholder="% antecipação"
                            className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm"
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
                  <option value="CARTAO">Cartão</option>
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
                <input name="observacoes" placeholder="Ex: pago direto na secretaria antes do sistema" className={bareCls} />
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

      {/* ── Cancelar matrícula ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
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
    </div>
  );
}
