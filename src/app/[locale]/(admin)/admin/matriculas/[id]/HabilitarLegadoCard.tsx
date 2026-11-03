"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import {
  habilitarAlunoLegadoAction,
  buscarHabilitacaoLegadoAction,
  type HabilitacaoLegadoInfo,
} from "../habilitar-legado-actions";

// Cartão "Habilitar aluno" da edição da matrícula (ao lado de "Cancelar matrícula").
// - Aluno NÃO ativo (ex.: veio do legado): mostra o formulário (curso + data do 1º vencimento;
//   as parcelas saem mês a mês a partir dela).
// - Aluno ATIVO que passou por aqui: mostra o REGISTRO do que foi feito (quem, quando, curso,
//   data, parcelas), para identificar o processo. Sem registro: não mostra nada.
// Admin, secretaria e professor são validados de novo no servidor.
const PAPEL: Record<string, string> = { ADMIN_GLOBAL: "Admin", SECRETARIA: "Secretaria", PROFESSOR: "Professor" };

function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export default function HabilitarLegadoCard({ alunoId, ativo }: { alunoId: string; ativo: boolean }) {
  const router = useRouter();
  const [curso, setCurso] = useState<"" | "BASICO" | "MEDIO">("");
  const [data, setData] = useState("");
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [info, setInfo] = useState<HabilitacaoLegadoInfo | null>(null);

  useEffect(() => {
    // Só busca o registro quando o aluno está ATIVO; com aluno não ativo o formulário é mostrado e `info` é ignorado.
    if (!ativo) return;
    let vivo = true;
    buscarHabilitacaoLegadoAction(alunoId).then((r) => {
      if (vivo) setInfo(r);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, alunoId]);

  function habilitar() {
    if (!curso) {
      setMsg({ ok: false, texto: "Escolha Curso Básico ou Curso Médio." });
      return;
    }
    if (!data) {
      setMsg({ ok: false, texto: "Informe a data do primeiro vencimento." });
      return;
    }
    setMsg(null);
    iniciar(async () => {
      const r = await habilitarAlunoLegadoAction(alunoId, curso, data);
      setMsg(r.ok ? { ok: true, texto: r.mensagem } : { ok: false, texto: r.erro });
      if (r.ok) router.refresh();
    });
  }

  const inputCls = "w-full rounded-xl border border-iw-gold bg-white px-3 py-2 text-sm text-black";

  // Aluno ativo: só o registro (ou nada, se não houver).
  if (ativo) {
    if (!info) return null;
    const quando = new Date(info.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    return (
      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-iw-success" />
          <h2 className="text-sm font-black uppercase tracking-wider text-black">Aluno habilitado</h2>
        </div>
        <p className="text-xs text-iw-muted">Registro da habilitação do cadastro do legado.</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="font-bold text-iw-muted uppercase tracking-wider text-[10px]">Curso</dt>
            <dd className="font-semibold text-iw-navy">{info.curso ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-bold text-iw-muted uppercase tracking-wider text-[10px]">1º vencimento</dt>
            <dd className="font-semibold text-iw-navy">{dataBr(info.primeiroVencimento)}</dd>
          </div>
          <div>
            <dt className="font-bold text-iw-muted uppercase tracking-wider text-[10px]">Parcelas geradas</dt>
            <dd className="font-semibold text-iw-navy">{info.parcelasGeradas}</dd>
          </div>
          <div>
            <dt className="font-bold text-iw-muted uppercase tracking-wider text-[10px]">Matrícula</dt>
            <dd className="font-semibold text-iw-navy">{info.matriculaCriada ? "Criada na habilitação" : "Já existia"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-bold text-iw-muted uppercase tracking-wider text-[10px]">Habilitado por</dt>
            <dd className="font-semibold text-iw-navy">
              {info.quem ?? "—"} ({PAPEL[info.papel] ?? info.papel}) em {quando}
            </dd>
          </div>
        </dl>
        {info.aviso && <p className="text-xs font-semibold text-iw-warning">{info.aviso}</p>}
      </div>
    );
  }

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-iw-gold" />
        <h2 className="text-sm font-black uppercase tracking-wider text-black">Habilitar aluno</h2>
      </div>
      <p className="text-xs text-iw-muted">
        Este aluno não está ativo (cadastro do legado). Escolha o curso em que ele está cursando e a data do primeiro
        vencimento: as parcelas são geradas a partir dela.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-iw-navy">
          Curso
          <select
            value={curso}
            onChange={(e) => setCurso(e.target.value as "" | "BASICO" | "MEDIO")}
            disabled={pendente}
            className={inputCls + " mt-1"}
          >
            <option value="">Selecione o curso…</option>
            <option value="BASICO">Curso Teológico Básico</option>
            <option value="MEDIO">Curso Teológico Médio</option>
          </select>
        </label>
        <label className="text-xs font-bold text-iw-navy">
          Data do 1º vencimento
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={pendente}
            className={inputCls + " mt-1"}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={habilitar}
        disabled={pendente || !curso || !data}
        className="inline-flex items-center gap-2 bg-black text-white border-[1.5px] border-[#CF8403] font-bold text-xs uppercase px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {pendente ? "Habilitando…" : "Habilitar e vincular"}
      </button>
      {msg && (
        <p className={`text-xs font-semibold ${msg.ok ? "text-iw-success" : "text-iw-warning"}`}>{msg.texto}</p>
      )}
    </div>
  );
}
