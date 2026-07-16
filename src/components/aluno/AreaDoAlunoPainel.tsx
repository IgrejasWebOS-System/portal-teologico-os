"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Settings2,
  GraduationCap,
  Wallet,
  ClipboardCheck,
  ChevronLeft,
  ChevronDown,
  LogOut,
  KeyRound,
} from "lucide-react";
import { signOutGlobalAction } from "@/app/actions";
import { trocarSenhaAlunoAction } from "@/app/(escola)/aluno-actions";

// ============================================================
// "Área do Aluno" — menu lateral retrátil com 5 seções (Meus
// Dados, Conta, Curso, Financeiro, Provas e Testes). Colapsado
// vira uma aba fina; expandido mostra um menu por escrito
// (ícone + rótulo), e clicar num item abre o conteúdo dele em
// sanfona logo abaixo, dentro do próprio menu. Renderizado no
// layout de (escola) para quem tem ficha de aluno oficial
// (ead_alunos) vinculada ao login.
// ============================================================

export interface AlunoResumo {
  nomeCompleto: string;
  cpf: string | null;
  email: string;
  telefone: string | null;
  campoMinisterioNome: string | null;
  status: string;
}

export interface MatriculaResumo {
  id: string;
  cursoNomeSnapshot: string;
  matricula: string;
  status: string;
  dataMatricula: string;
}

export interface ParcelaResumo {
  descricao: string;
  numeroParcela: number;
  totalParcelas: number;
  valorBrutoCentavos: number;
  status: string;
  dataVencimento: string;
  responsavelPagamento: string;
}

export interface AvaliacaoResumo {
  tipo: string;
  status: string;
  nota: number | null;
  aprovado: boolean | null;
  numQuestoes: number;
  acertos: number | null;
  finalizadaEm: string | null;
}

type Secao = "dados" | "conta" | "curso" | "financeiro" | "provas";

const SECOES: { key: Secao; label: string; icon: LucideIcon }[] = [
  { key: "dados", label: "Meus Dados", icon: User },
  { key: "conta", label: "Conta", icon: Settings2 },
  { key: "curso", label: "Curso", icon: GraduationCap },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "provas", label: "Provas e Testes", icon: ClipboardCheck },
];

const STATUS_PARCELA_CLS: Record<string, string> = {
  PAGO: "bg-iw-success-bg text-iw-success",
  PENDENTE: "bg-iw-gold/10 text-iw-gold",
  ATRASADO: "bg-iw-error-bg text-iw-error",
  CANCELADO: "bg-iw-bg text-iw-muted",
};

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("pt-BR");
}

export default function AreaDoAlunoPainel({
  aluno,
  matriculas,
  parcelas,
  avaliacoes,
}: {
  aluno: AlunoResumo;
  matriculas: MatriculaResumo[];
  parcelas: ParcelaResumo[];
  avaliacoes: AvaliacaoResumo[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contaMsg = searchParams.get("contaMsg") ?? undefined;
  const contaError = searchParams.get("contaError") ?? undefined;
  const returnPath = pathname;

  const [expandido, setExpandido] = useState(!!(contaMsg || contaError));
  const [secaoAtiva, setSecaoAtiva] = useState<Secao | null>(contaMsg || contaError ? "conta" : null);

  function renderSecao(key: Secao) {
    switch (key) {
      case "dados":
        return (
          <div className="space-y-3 text-sm">
            <Campo label="Nome completo" valor={aluno.nomeCompleto} />
            <Campo label="CPF" valor={aluno.cpf ?? "—"} />
            <Campo label="E-mail" valor={aluno.email} />
            <Campo label="Telefone" valor={aluno.telefone ?? "—"} />
            <Campo label="Campo / Ministério" valor={aluno.campoMinisterioNome ?? "—"} />
            <Campo label="Situação" valor={aluno.status} />
          </div>
        );

      case "conta":
        return (
          <div className="space-y-4 text-sm">
            {contaMsg && (
              <div className="px-3 py-2 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-xs font-medium">
                {contaMsg}
              </div>
            )}
            {contaError && (
              <div className="px-3 py-2 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-xs font-medium">
                {contaError}
              </div>
            )}

            <Campo label="Login" valor={aluno.email} />

            <form action={trocarSenhaAlunoAction} className="space-y-2 pt-2 border-t border-iw-border">
              <input type="hidden" name="returnPath" value={returnPath} />
              <p className="text-xs font-bold text-iw-muted uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Trocar senha
              </p>
              <input
                type="password"
                name="password"
                placeholder="Nova senha"
                required
                minLength={6}
                className="w-full bg-iw-bg border border-iw-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="password"
                name="confirm"
                placeholder="Confirmar nova senha"
                required
                minLength={6}
                className="w-full bg-iw-bg border border-iw-border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-iw-blue text-white text-xs font-bold hover:bg-iw-navy transition-colors"
              >
                Atualizar senha
              </button>
            </form>

            <form action={signOutGlobalAction} className="pt-2 border-t border-iw-border">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-iw-error hover:bg-iw-error-bg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair de todos os dispositivos
              </button>
            </form>
          </div>
        );

      case "curso":
        return (
          <div className="space-y-3">
            {matriculas.length === 0 ? (
              <p className="text-xs text-iw-muted">Nenhuma matrícula oficial encontrada.</p>
            ) : (
              matriculas.map((m) => (
                <div key={m.id} className="bg-iw-bg rounded-xl p-3 space-y-1">
                  <p className="text-sm font-bold text-iw-navy">{m.cursoNomeSnapshot}</p>
                  <p className="text-xs text-iw-muted">Matrícula {m.matricula}</p>
                  <p className="text-xs text-iw-muted">Desde {fmtData(m.dataMatricula)}</p>
                  <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-iw-blue/10 text-iw-blue mt-1">
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        );

      case "financeiro":
        return (
          <div className="space-y-2">
            {parcelas.length === 0 ? (
              <p className="text-xs text-iw-muted">Nenhuma parcela lançada ainda.</p>
            ) : (
              parcelas.map((p, i) => (
                <div key={i} className="bg-iw-bg rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-iw-navy truncate">{p.descricao}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_PARCELA_CLS[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-iw-muted">
                    Parcela {p.numeroParcela}/{p.totalParcelas} · {fmt(p.valorBrutoCentavos)} · vence {fmtData(p.dataVencimento)}
                  </p>
                  {p.responsavelPagamento === "IGREJA" && (
                    <p className="text-[10px] text-iw-gold font-semibold">Financiamento interno (igreja)</p>
                  )}
                </div>
              ))
            )}
          </div>
        );

      case "provas":
        return (
          <div className="space-y-2">
            {avaliacoes.length === 0 ? (
              <p className="text-xs text-iw-muted">Nenhum simulado ou prova realizado ainda.</p>
            ) : (
              avaliacoes.map((a, i) => (
                <div key={i} className="bg-iw-bg rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-iw-navy">{a.tipo === "PROVA" ? "Prova final" : "Simulado"}</p>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-iw-blue/10 text-iw-blue">
                      {a.status}
                    </span>
                  </div>
                  {a.status === "FINALIZADA" ? (
                    <p className="text-xs text-iw-muted">
                      {a.acertos}/{a.numQuestoes} acertos · nota {a.nota?.toFixed(1)} ·{" "}
                      <span className={a.aprovado ? "text-iw-success font-semibold" : "text-iw-error font-semibold"}>
                        {a.aprovado ? "Aprovado" : "Não aprovado"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-iw-muted">Em andamento</p>
                  )}
                  <p className="text-[10px] text-iw-muted">{fmtData(a.finalizadaEm)}</p>
                </div>
              ))
            )}
          </div>
        );
    }
  }

  return (
    <>
      {/* Aba colapsada */}
      {!expandido && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="fixed left-64 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 bg-iw-navy text-white text-xs font-bold px-2.5 py-3 rounded-r-xl shadow-lg hover:bg-iw-blue transition-colors [writing-mode:vertical-rl]"
          title="Abrir área do aluno"
        >
          <User className="w-4 h-4 rotate-90" />
          Minha Área
        </button>
      )}

      {/* Menu expandido — ícone + rótulo por escrito; o conteúdo da
          seção ativa abre em sanfona logo abaixo dela */}
      {expandido && (
        <div className="fixed left-64 top-0 bottom-0 z-40 w-72 bg-white border-r border-iw-border shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
          <div className="sticky top-0 bg-iw-navy px-4 py-3 flex items-center justify-between z-10">
            <h3 className="text-sm font-black text-white">Minha Área</h3>
            <button
              type="button"
              onClick={() => {
                setExpandido(false);
                setSecaoAtiva(null);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-iw-sky/70 hover:bg-white/10 hover:text-white transition-colors"
              title="Recolher"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-2 space-y-0.5">
            {SECOES.map((s) => {
              const Icon = s.icon;
              const ativo = secaoAtiva === s.key;
              return (
                <div key={s.key}>
                  <button
                    type="button"
                    onClick={() => setSecaoAtiva(ativo ? null : s.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      ativo ? "bg-iw-gold/10 text-iw-gold" : "text-iw-navy hover:bg-iw-bg"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{s.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${ativo ? "rotate-180" : ""}`} />
                  </button>

                  {ativo && <div className="px-3 pb-4 pt-1">{renderSecao(s.key)}</div>}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-iw-navy font-medium">{valor}</p>
    </div>
  );
}
