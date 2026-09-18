"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Settings2,
  GraduationCap,
  Wallet,
  ClipboardCheck,
  Printer,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  KeyRound,
} from "lucide-react";
import { signOutGlobalAction } from "@/app/actions";
import { trocarSenhaAlunoAction } from "@/app/[locale]/(escola)/aluno-actions";
import { cn } from "@/utils/cn";
import { montarPayloadPix, DADOS_PIX_CETADP } from "@/utils/financeiro/pix";
import QRCode from "qrcode";
import { QrCode, Copy, Check } from "lucide-react";

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
  id: string;
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

type Secao = "dados" | "conta" | "curso" | "financeiro" | "provas" | "impressao";

const SECOES: { key: Secao; label: string; icon: LucideIcon }[] = [
  { key: "dados", label: "Meus Dados", icon: User },
  { key: "conta", label: "Conta", icon: Settings2 },
  { key: "curso", label: "Curso", icon: GraduationCap },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "provas", label: "Provas e Testes", icon: ClipboardCheck },
  { key: "impressao", label: "Impressão", icon: Printer },
];

// Documentos que o aluno pode imprimir/salvar em PDF diretamente do
// navegador — cada um abre sua própria tela em src/app/[locale]/portal/impressao/.
const ITENS_IMPRESSAO: { href: string; label: string }[] = [
  { href: "/portal/impressao/ficha", label: "Ficha Aluno" },
  { href: "/portal/impressao/testes", label: "Testes" },
  { href: "/portal/impressao/prova", label: "Prova" },
  { href: "/portal/impressao/declaracao", label: "Declaração" },
  { href: "/portal/impressao/certificado", label: "Certificado" },
  { href: "/portal/impressao/irpf", label: "Informe IRPF" },
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
  expandido = true,
  onToggleExpandido,
  modoStaff = false,
  alunoId,
}: {
  aluno: AlunoResumo;
  matriculas: MatriculaResumo[];
  parcelas: ParcelaResumo[];
  avaliacoes: AvaliacaoResumo[];
  // "Aberto" = ícone + rótulo (padrão). "Recolhido" = só ícone, sem
  // sanfona de conteúdo. Estado movido pra SidebarShell em 13/09/2026 —
  // antes vivia só aqui e recolhia só o miolo deste bloco, deixando os
  // ícones flutuando centralizados numa barra ainda larga; agora o
  // toggle recolhe a barra INTEIRA (ver Sidebar.tsx/SidebarShell.tsx).
  expandido?: boolean;
  onToggleExpandido?: () => void;
  // Painel acessado pela secretaria (Cadastro de Alunos > gerenciar em
  // nome do aluno), em vez do próprio aluno logado (15/09/2026). Nesse
  // modo escondemos "Trocar senha" e "Sair de todos os dispositivos" —
  // essas ações agem sobre a sessão de quem está logado (o STAFF), não
  // sobre a conta do aluno, então mostrá-las aqui seria enganoso/perigoso.
  modoStaff?: boolean;
  // ead_alunos.id — só precisa ser passado em modoStaff, pra anexar
  // ?alunoId= nos links de Impressão (ver checagem de staff em
  // resolverAlunoEMatricula/utils/aluno/matriculaAtiva.ts).
  alunoId?: string;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const contaMsg = searchParams.get("contaMsg") ?? undefined;
  const contaError = searchParams.get("contaError") ?? undefined;
  const returnPath = pathname;

  const [secaoAtiva, setSecaoAtiva] = useState<Secao | null>(contaMsg || contaError ? "conta" : null);

  // Pix estático (14/09/2026) — QR gerado no client, sem confirmação
  // automática de pagamento (ver utils/financeiro/pix.ts).
  const [parcelaPagando, setParcelaPagando] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function abrirPagamento(p: ParcelaResumo) {
    if (parcelaPagando === p.id) {
      setParcelaPagando(null);
      setQrDataUrl(null);
      return;
    }
    setParcelaPagando(p.id);
    setCopiado(false);
    const payload = montarPayloadPix({
      valorCentavos: p.valorBrutoCentavos,
      txid: p.id,
      descricao: p.descricao,
    });
    const url = await QRCode.toDataURL(payload, { margin: 1, width: 220, errorCorrectionLevel: "M" });
    setQrDataUrl(url);
  }

  function copiarCodigoPix(p: ParcelaResumo) {
    const payload = montarPayloadPix({ valorCentavos: p.valorBrutoCentavos, txid: p.id, descricao: p.descricao });
    navigator.clipboard.writeText(payload);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

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

            {modoStaff ? (
              <p className="text-xs text-iw-sky/50 pt-2 border-t border-white/10">
                Troca de senha e encerramento de sessão só podem ser feitos pelo próprio aluno,
                logado com sua própria conta — aqui é só consulta e gerenciamento pela secretaria.
              </p>
            ) : (
              <>
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
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sair de todos os dispositivos
                  </button>
                </form>
              </>
            )}
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
                  <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-iw-blue/20 text-iw-navy mt-1">
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

                  {p.status === "PENDENTE" && (
                    <>
                      <button
                        type="button"
                        onClick={() => abrirPagamento(p)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-iw-gold hover:text-white transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {parcelaPagando === p.id ? "Fechar pagamento" : "Pagar esta parcela"}
                      </button>

                      {parcelaPagando === p.id && (
                        <div className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] text-iw-sky/60">
                            Pix estático — {fmt(p.valorBrutoCentavos)} para {DADOS_PIX_CETADP.razaoSocial}.
                            Após pagar, avise a secretaria ou seu professor para confirmar a baixa.
                          </p>
                          {qrDataUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qrDataUrl} alt="QR Code Pix" className="w-28 h-28 rounded-lg bg-white p-1.5 mx-auto" />
                          ) : (
                            <p className="text-[10px] text-iw-sky/50 text-center">Gerando QR…</p>
                          )}
                          <button
                            type="button"
                            onClick={() => copiarCodigoPix(p)}
                            className="w-full flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors"
                          >
                            {copiado ? <Check className="w-3.5 h-3.5 text-iw-success" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiado ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
                          </button>
                          <p className="text-[10px] text-iw-sky/50 leading-relaxed">
                            Ou transferência: {DADOS_PIX_CETADP.banco}, agência {DADOS_PIX_CETADP.agencia}, conta{" "}
                            {DADOS_PIX_CETADP.contaCorrente}, CNPJ {DADOS_PIX_CETADP.cnpjFormatado}.
                          </p>
                        </div>
                      )}
                    </>
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
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-iw-blue/20 text-iw-navy">
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

      case "impressao":
        return (
          <div className="space-y-1">
            {ITENS_IMPRESSAO.map((item) => (
              <Link
                key={item.href}
                href={modoStaff && alunoId ? `${item.href}?alunoId=${alunoId}` : item.href}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-iw-sky/80 hover:bg-white/8 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
            if (expandido) setSecaoAtiva(null);
            onToggleExpandido?.();
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
                    onToggleExpandido?.();
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
