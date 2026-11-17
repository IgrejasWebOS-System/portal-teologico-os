"use client";

// ============================================================
// Modais "Transferir turma" e "Desativar/Reativar professor" (17/11/2026).
// Nada aqui exclui dados: transferir move vínculos e alunos em curso;
// desativar tira o acesso mantendo todo o histórico. Regras de negócio
// ficam em gestao-actions.ts (server) — aqui só a tela.
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  listarTurmasDoProfessorAction,
  transferirTurmaProfessorAction,
  desativarProfessorAction,
  reativarProfessorAction,
  type TurmaDoProfessor,
} from "./gestao-actions";

export type ProfessorResumo = { id: string; nome_completo: string; ativo: boolean };

function Moldura({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="w-full max-w-lg bg-iw-surface rounded-2xl border border-iw-gold shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-black text-iw-navy">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-iw-muted hover:text-iw-navy transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Aviso({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border text-sm font-medium ${
        ok ? "bg-iw-bg border-iw-gold text-iw-navy" : "bg-iw-error-bg border-iw-error text-iw-error"
      }`}
    >
      {children}
    </div>
  );
}

// ── Transferir turma ─────────────────────────────────────────────

export function TransferirTurmaModal({
  professor,
  destinos,
  onClose,
}: {
  professor: ProfessorResumo;
  destinos: ProfessorResumo[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [turmas, setTurmas] = useState<TurmaDoProfessor[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    listarTurmasDoProfessorAction(professor.id).then((res) => {
      if (cancelado) return;
      if (!res.success) {
        setErroCarga(res.message ?? "Erro ao buscar as turmas.");
        setTurmas([]);
        return;
      }
      const lista = res.turmas ?? [];
      setTurmas(lista);
      setSelecionadas(lista.map((t) => t.course_edition_id));
    });
    return () => {
      cancelado = true;
    };
  }, [professor.id]);

  function alternar(id: string) {
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function confirmar() {
    setEnviando(true);
    setResultado(null);
    try {
      const res = await transferirTurmaProfessorAction({
        deProfessorId: professor.id,
        paraProfessorId: destinoId,
        courseEditionIds: selecionadas,
        reativarDestino: destinoInativo,
      });
      setResultado({ ok: res.success, texto: res.message ?? (res.success ? "Turma transferida." : "Erro ao transferir.") });
      if (res.success) router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const concluido = resultado?.ok === true;
  const destinoSelecionado = destinos.find((d) => d.id === destinoId);
  const destinoInativo = destinoSelecionado ? !destinoSelecionado.ativo : false;

  return (
    <Moldura titulo={`Transferir turma de ${professor.nome_completo}`} onClose={onClose}>
      {turmas === null ? (
        <p className="text-sm text-iw-muted">Carregando turmas…</p>
      ) : erroCarga ? (
        <Aviso ok={false}>{erroCarga}</Aviso>
      ) : turmas.length === 0 ? (
        <Aviso ok>Este professor não tem turmas vinculadas.</Aviso>
      ) : (
        <>
          <p className="text-xs text-iw-muted">
            Os alunos em curso (andamento ou pausados) das turmas marcadas passam para o professor de destino. Alunos já
            aprovados, reprovados ou cancelados continuam no histórico do professor atual.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-1">Turmas a transferir</legend>
            {turmas.map((t) => (
              <label
                key={t.course_edition_id}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-iw-border bg-iw-bg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(t.course_edition_id)}
                  onChange={() => alternar(t.course_edition_id)}
                  disabled={concluido}
                  className="mt-0.5"
                />
                <span className="text-sm text-iw-navy">
                  <span className="font-semibold">{t.titulo}</span>
                  <span className="block text-xs text-iw-muted">
                    {t.vinculos.join(" · ")} — {t.alunos_em_curso} aluno(s) em curso
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-1">
            <label htmlFor="destino-professor" className="text-xs font-bold text-iw-muted uppercase tracking-wider">
              Passar para o professor
            </label>
            <select
              id="destino-professor"
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              disabled={concluido}
              className="w-full bg-iw-surface border border-iw-gold rounded-xl px-3.5 py-2.5 text-sm text-black"
            >
              <option value="">Selecione…</option>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome_completo}
                  {d.ativo ? "" : " (desativado)"}
                </option>
              ))}
            </select>
            {destinoInativo && !concluido && (
              <p className="text-xs font-semibold text-iw-error">
                Este professor está desativado. Ao transferir, ele será reativado automaticamente e voltará a ter
                acesso.
              </p>
            )}
          </div>
        </>
      )}

      {resultado && <Aviso ok={resultado.ok}>{resultado.texto}</Aviso>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {concluido ? "Fechar" : "Cancelar"}
        </Button>
        {!concluido && turmas !== null && turmas.length > 0 && (
          <Button
            size="sm"
            loading={enviando}
            disabled={!destinoId || selecionadas.length === 0}
            onClick={confirmar}
          >
            Transferir
          </Button>
        )}
      </div>
    </Moldura>
  );
}

// ── Desativar / reativar ─────────────────────────────────────────

export function AtivacaoProfessorModal({
  professor,
  onClose,
}: {
  professor: ProfessorResumo;
  onClose: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const desativando = professor.ativo;
  const concluido = resultado?.ok === true;

  async function confirmar() {
    setEnviando(true);
    setResultado(null);
    try {
      const res = desativando
        ? await desativarProfessorAction(professor.id, motivo)
        : await reativarProfessorAction(professor.id);
      setResultado({ ok: res.success, texto: res.message ?? (res.success ? "Feito." : "Erro.") });
      if (res.success) router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Moldura
      titulo={desativando ? `Desativar ${professor.nome_completo}` : `Reativar ${professor.nome_completo}`}
      onClose={onClose}
    >
      {desativando ? (
        <>
          <p className="text-sm text-iw-navy">
            O professor perde o acesso à Área do Professor. O cadastro, as turmas antigas, as presenças, as despesas e a
            auditoria continuam no sistema. Você pode reativá-lo quando quiser.
          </p>
          <p className="text-xs text-iw-muted">
            Só é possível desativar quem não tem mais turma nem aluno em curso — use antes &ldquo;Transferir turma&rdquo;.
          </p>
          <div className="space-y-1">
            <label htmlFor="motivo-desativacao" className="text-xs font-bold text-iw-muted uppercase tracking-wider">
              Motivo (opcional)
            </label>
            <textarea
              id="motivo-desativacao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={concluido}
              rows={3}
              className="w-full bg-iw-surface border border-iw-gold rounded-xl px-3.5 py-2.5 text-sm text-black"
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-iw-navy">
          O professor volta a ter acesso à Área do Professor e reaparece nas listas de matrícula. Se o login tinha sido
          bloqueado na desativação, ele é liberado.
        </p>
      )}

      {resultado && <Aviso ok={resultado.ok}>{resultado.texto}</Aviso>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {concluido ? "Fechar" : "Cancelar"}
        </Button>
        {!concluido && (
          <Button size="sm" variant={desativando ? "danger" : "primary"} loading={enviando} onClick={confirmar}>
            {desativando ? "Desativar" : "Reativar"}
          </Button>
        )}
      </div>
    </Moldura>
  );
}
