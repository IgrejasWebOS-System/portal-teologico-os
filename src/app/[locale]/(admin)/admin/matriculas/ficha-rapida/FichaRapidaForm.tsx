"use client";

import { useMemo, useState, useTransition } from "react";
import { Send, Loader2, AlertTriangle, QrCode, Copy, Check, UserPlus } from "lucide-react";
import { validarCPF } from "@/utils/cpf";
import PageHeader from "@/components/layout/PageHeader";
import { criarFichaPendenteAction } from "./actions";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type Curso = { id: string; title: string; module: string };
type SelectItem = { id: string; name: string };
type Church = { id: string; name: string; sector_id: string | null };

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

interface ResultadoFicha {
  alunoId: string;
  matricula: string;
  nomeCompleto: string;
  url: string;
  qrCodeDataUrl: string | null;
}

export default function FichaRapidaForm({
  campos, cursos, churches, setores,
}: {
  campos: CampoMinisterio[];
  cursos: Curso[];
  churches: Church[];
  setores: SelectItem[];
}) {
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoFicha | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cursosEscola = cursos.filter((c) => c.module === "escola");
  const cursosOutros = cursos.filter((c) => c.module !== "escola");
  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );

  const handleSubmit = (fd: FormData) => {
    if (!validarCPF(cpf)) {
      setErro("CPF inválido — confira os dígitos digitados.");
      return;
    }
    setErro("");
    fd.set("cpf", cpf);
    fd.set("telefone", telefone);
    fd.set("sector_id", sectorId);
    fd.set("church_id_aluno", churchId);
    startTransition(async () => {
      const res = await criarFichaPendenteAction(fd);
      if (!res.success || !res.data) {
        setErro(res.message ?? "Erro ao gerar ficha.");
        return;
      }
      setResultado(res.data as ResultadoFicha);
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
    <div className="max-w-3xl mx-auto space-y-6 pb-16 px-2">
      <PageHeader
        title="Ficha Rápida — Matrícula por QR Code"
        description="Cadastro mínimo a partir da ficha de papel — o resto (endereço, foto, dados pessoais) o aluno completa sozinho pelo celular."
        backHref="/admin/matriculas"
        backLabel="Voltar para Matrículas"
      />

      {erro && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      <form action={handleSubmit} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
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
          <Field label="Telefone" span="col-span-6 md:col-span-3">
            <input
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={bareCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <Field label="Curso" required span="col-span-12 md:col-span-4">
            <select name="course_id" required defaultValue="" className={bareSelectCls}>
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
          <Field label="Campo / Ministério" span="col-span-12 md:col-span-4">
            <select name="campo_ministerio_id" className={bareSelectCls} defaultValue="">
              <option value="">Selecione (opcional)</option>
              {campos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Setor" span="col-span-6 md:col-span-2">
            <select
              value={sectorId}
              onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
              className={bareSelectCls}
            >
              <option value="">Selecione...</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Igreja" span="col-span-6 md:col-span-2">
            <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {igrejasDoSetor.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
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
