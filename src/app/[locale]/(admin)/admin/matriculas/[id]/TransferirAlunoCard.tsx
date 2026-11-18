"use client";

// Cartão "Transferir aluno" da ficha da matrícula (17/11/2026). A matrícula é
// a mesma: só troca a turma (outro núcleo/professor do MESMO curso). Mostra o
// histórico das transferências já feitas. Permissões validadas de novo no
// servidor (admin/secretaria no escopo, ou o professor dono da matrícula).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui";
import {
  listarDestinosTransferenciaAction,
  transferirAlunoAction,
  buscarTransferenciasAction,
  type DadosTransferencia,
  type TransferenciaHistorico,
} from "../transferir-aluno-actions";

const PAPEL: Record<string, string> = { ADMIN_GLOBAL: "Admin", SECRETARIA: "Secretaria", PROFESSOR: "Professor" };

export default function TransferirAlunoCard({ matriculaId }: { matriculaId: string }) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosTransferencia | null>(null);
  const [historico, setHistorico] = useState<TransferenciaHistorico[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [turmaId, setTurmaId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarDestinosTransferenciaAction(matriculaId), buscarTransferenciasAction(matriculaId)]).then(
      ([d, h]) => {
        if (!vivo) return;
        if (!d.success || !d.dados) {
          setErroCarga(d.message ?? "Erro ao carregar as turmas.");
          return;
        }
        setDados(d.dados);
        setHistorico(h);
      }
    );
    return () => {
      vivo = false;
    };
  }, [matriculaId, versao]);

  const destino = dados?.destinos.find((d) => d.turma_id === turmaId);
  const exigeProfessor = (destino?.professores.length ?? 0) > 1;

  async function transferir() {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await transferirAlunoAction({
        matriculaId,
        turmaDestinoId: turmaId,
        professorDestinoId: exigeProfessor ? professorId : null,
        motivo,
      });
      setMsg({ ok: r.success, texto: r.message ?? (r.success ? "Aluno transferido." : "Erro ao transferir.") });
      if (r.success) {
        setTurmaId("");
        setProfessorId("");
        setMotivo("");
        setVersao((v) => v + 1);
        router.refresh();
      }
    } finally {
      setEnviando(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-iw-gold bg-white px-3 py-2 text-sm text-black";

  // Altura: no desktop o cartão ocupa exatamente a altura da coluna da esquerda
  // (Aluno habilitado + Cancelar matrícula) e o conteúdo rola por dentro, para a
  // tela não "pular" quando o histórico cresce. No celular fica uma coluna normal.
  return (
    <div className="relative min-h-[24rem] lg:min-h-[34rem]">
    <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3 lg:absolute lg:inset-0 lg:overflow-y-auto">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-iw-gold" />
        <h2 className="text-sm font-black uppercase tracking-wider text-black">Transferir aluno</h2>
      </div>

      {erroCarga ? (
        <p className="text-xs font-semibold text-iw-warning">{erroCarga}</p>
      ) : !dados ? (
        <p className="text-xs text-iw-muted">Carregando…</p>
      ) : !dados.podeTransferir ? (
        <p className="text-xs text-iw-muted">{dados.motivoBloqueio}</p>
      ) : (
        <>
          <p className="text-xs text-iw-muted">
            Passa o aluno para outra turma (outro núcleo) do mesmo curso. A matrícula, as parcelas, as provas e a
            presença continuam as mesmas. Hoje: <strong className="text-iw-navy">{dados.turmaAtual ?? "—"}</strong>
            {dados.professorAtual ? ` · professor ${dados.professorAtual}` : ""}.
          </p>

          {dados.destinos.length === 0 ? (
            <p className="text-xs font-semibold text-iw-warning">Não há outra turma aberta deste curso para receber o aluno.</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-iw-navy">
                Turma de destino
                <select
                  value={turmaId}
                  onChange={(e) => {
                    setTurmaId(e.target.value);
                    setProfessorId("");
                  }}
                  disabled={enviando}
                  className={inputCls + " mt-1"}
                >
                  <option value="">Selecione…</option>
                  {dados.destinos.map((d) => (
                    <option key={d.turma_id} value={d.turma_id}>
                      {d.titulo}
                    </option>
                  ))}
                </select>
              </label>

              {destino && destino.professores.length === 0 && (
                <p className="text-xs font-semibold text-iw-warning">
                  Esta turma ainda não tem professor ativo vinculado. O aluno fica sem professor até a turma receber um.
                </p>
              )}
              {destino && destino.professores.length === 1 && (
                <p className="text-xs text-iw-muted">
                  Professor da turma: <strong className="text-iw-navy">{destino.professores[0].nome}</strong>
                </p>
              )}
              {exigeProfessor && (
                <label className="block text-xs font-bold text-iw-navy">
                  Professor do aluno nesta turma
                  <select
                    value={professorId}
                    onChange={(e) => setProfessorId(e.target.value)}
                    disabled={enviando}
                    className={inputCls + " mt-1"}
                  >
                    <option value="">Selecione…</option>
                    {destino!.professores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-xs font-bold text-iw-navy">
                Motivo da transferência
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={enviando}
                  rows={2}
                  className={inputCls + " mt-1"}
                />
              </label>

              <Button
                size="sm"
                loading={enviando}
                disabled={!turmaId || motivo.trim().length < 5 || (exigeProfessor && !professorId)}
                onClick={transferir}
              >
                Transferir aluno
              </Button>
            </div>
          )}
        </>
      )}

      {msg && (
        <p className={`text-xs font-semibold ${msg.ok ? "text-iw-success" : "text-iw-warning"}`}>{msg.texto}</p>
      )}

      {historico.length > 0 && (
        <div className="pt-2 border-t border-iw-border space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-iw-muted">Transferências anteriores</h3>
          <ul className="space-y-2">
            {historico.map((h, i) => (
              <li key={i} className="text-xs text-iw-navy">
                <span className="font-semibold">
                  {h.de ?? "—"} → {h.para ?? "—"}
                </span>
                {h.professorPara ? ` · professor ${h.professorPara}` : ""}
                <span className="block text-iw-muted">
                  {new Date(h.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  {h.papel ? ` · ${PAPEL[h.papel] ?? h.papel}` : ""}
                  {h.motivo ? ` · ${h.motivo}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div>
  );
}
