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
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  KeyRound,
} from "lucide-react";
import { signOutGlobalAction } from "@/app/actions";
import { trocarSenhaAlunoAction } from "@/app/(escola)/aluno-actions";
import { cn } from "@/utils/cn";

// ============================================================
// "Minha Área" — bloco embutido no próprio Sidebar (não é mais um
// painel flutuante à parte) no lugar de "Módulos", para quem tem
// ficha de aluno oficial (ead_alunos) vinculada ao login. Mesmo
// cabeçalho e mesmo rodapé (Sair da conta) do Sidebar continuam
// intactos — só o miolo do menu muda. 5 seções (Meus Dados, Conta,
// Curso, Financeiro, Provas e Testes); clicar numa seção abre o
// conteúdo dela em sanfona logo abaixo. Pode ficar aberto (ícone +
// rótulo) ou recolhido (só ícone) — padrão aberto.
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
  CANCELADO: "bg-white/10 text-iw-sky/60",
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

  // "Aberto" = ícone + rótulo (padrão). "Recolhido" = só ícone,
  // sem sanfona de conteúdo.
  const [expandido, setExpandido] = useState(true);
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

            <form action={trocarSenhaAlunoAction} className="space-y-2 pt-2 border-t border-white/10">
              <input type="hidden" name="returnPath" value={returnPath} />
              <p className="text-xs font-bold text-iw-sky/50 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Trocar senha
              </p>
              <input
                type="password"
                name="password"
                placeholder="Nova senha"
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-iw-sky/40"
              />
              <input
                type="password"
                name="confirm"
                placeholder="Confirmar nova senha"
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-iw-sky/40"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-iw-blue text-gray-900 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Atualizar senha
              </button>
            </form>

            <form action={signOutGlobalAction} className="pt-2 border-t border-white/10">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair de todos os dispositivos
              </button>
            </form>
          </div>
        );

      case "curso":
        return (
          <div className="space-y-2">
            {matriculas.length === 0 ? (
              <p className="text-xs text-iw-sky/50">Nenhuma matrícula oficial encontrada.</p>
            ) : (
              matriculas.map((m) => (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                  <p className="text-sm font-bold text-white">{m.cursoNomeSnapshot}</p>
                  <p className="text-xs text-iw-sky/60">Matrícula {m.matricula}</p>
                  <p className="text-xs text-iw-sky/60">Desde {fmtData(m.dataMatricula)}</p>
                  <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-iw-blue/20 text-iw-blue mt-1">
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
              <p className="text-xs text-iw-sky/50">Nenhuma parcela lançada ainda.</p>
            ) : (
              parcelas.map((p, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{p.descricao}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_PARCELA_CLS[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-iw-sky/60">
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
              <p className="text-xs text-iw-sky/50">Nenhum simulado ou prova realizado ainda.</p>
            ) : (
              avaliacoes.map((a, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white">{a.tipo === "PROVA" ? "Prova final" : "Simulado"}</p>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-iw-blue/20 text-iw-blue">
                      {a.status}
                    </span>
                  </div>
                  {a.status === "FINALIZADA" ? (
                    <p className="text-xs text-iw-sky/60">
                      {a.acertos}/{a.numQuestoes} acertos · nota {a.nota?.toFixed(1)} ·{" "}
                      <span className={a.aprovado ? "text-iw-success font-semibold" : "text-iw-error font-semibold"}>
                        {a.aprovado ? "Aprovado" : "Não aprovado"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-iw-sky/60">Em andamento</p>
                  )}
                  <p className="text-[10px] text-iw-sky/50">{fmtData(a.finalizadaEm)}</p>
                </div>
              ))
            )}
          </div>
        );
    }
  }

  return (
    <div className="pb-3 mb-3 border-b border-white/10">
      <div className="flex items-center justify-between px-3 pb-2">
        {expandido && (
          <p className="text-iw-sky/40 text-xs font-semibold uppercase tracking-wider">Minha Área</p>
        )}
        <button
          type="button"
          onClick={() => {
            setExpandido((v) => !v);
            if (expandido) setSecaoAtiva(null);
          }}
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center text-iw-sky/50 hover:bg-white/10 hover:text-white transition-colors shrink-0",
            !expandido && "mx-auto"
          )}
          title={expandido ? "Recolher Minha Área" : "Expandir Minha Área"}
        >
          {expandido ? <ChevronsLeft className="w-3.5 h-3.5" /> : <ChevronsRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="space-y-0.5">
        {SECOES.map((s) => {
          const Icon = s.icon;
          const ativo = expandido && secaoAtiva === s.key;
          return (
            <div key={s.key}>
              <button
                type="button"
                onClick={() => {
                  if (!expandido) {
                    setExpandido(true);
                    setSecaoAtiva(s.key);
                  } else {
                    setSecaoAtiva(ativo ? null : s.key);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  !expandido && "justify-center px-0",
                  ativo
                    ? "bg-iw-blue text-white shadow-md"
                    : "text-iw-sky/80 hover:bg-white/8 hover:text-white"
                )}
                title={!expandido ? s.label : undefined}
              >
                <Icon className={cn("w-5 h-5 shrink-0 transition-colors", ativo ? "text-gray-800" : "text-iw-sky/60 group-hover:text-iw-sky")} />
                {expandido && (
                  <>
                    <span className="flex-1 text-left leading-tight truncate">{s.label}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", ativo && "rotate-180")} />
                  </>
                )}
              </button>

              {ativo && <div className="px-3 pt-2 pb-1">{renderSecao(s.key)}</div>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-iw-sky/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white font-medium">{valor}</p>
    </div>
  );
}
