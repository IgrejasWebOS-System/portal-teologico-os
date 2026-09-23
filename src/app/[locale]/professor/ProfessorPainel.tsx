"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  Lock,
  Receipt,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { montarPayloadPix, DADOS_PIX_CETADP } from "@/utils/financeiro/pix";
import TurmasDoProfessor, { type TurmaVinculo } from "./TurmasDoProfessor";

// ============================================================
// 21/09/2026, pedido do Joaquim (imagens 4 a 12): a tela /professor
// tinha dois problemas — (1) "Nova Matrícula" abria um formulário fora
// do padrão do projeto (ver ProfessorNovaMatriculaForm.tsx, resolvido à
// parte) e (2) "Meus Alunos" em cards grandes ficava poluído com muita
// gente vinculada. Este componente resolve o pedido de reorganização:
// junta "Minhas Turmas" + busca + Nova Matrícula numa mesma barra (à
// direita do título, como pedido na imagem 8), e troca os cards de
// aluno por uma tabela compacta com linha expansível — mesmas
// informações de antes, só escondidas até o professor pedir.
//
// Por que um componente novo em vez de mexer em TurmasDoProfessor ou em
// page.tsx: a busca/filtro (que fica visualmente na barra de "Minhas
// Turmas") e a tabela de alunos (seção separada, mais abaixo) precisam
// compartilhar o mesmo estado de filtro. TurmasDoProfessor é sobre
// turmas, não sobre alunos — não faz sentido ele guardar esse estado.
// page.tsx é Server Component — não pode guardar estado de UI. Este
// componente ("use client") é o dono do estado dos dois pedaços.
// ============================================================

type Media = { media: number | null; aprovado: boolean | null; quantidade: number };
type Parcela = {
  id: string;
  origem_id: string;
  numero_parcela: number;
  total_parcelas: number;
  descricao: string;
  valor_bruto_centavos: number;
  data_vencimento: string;
  status: string;
};
export type LinhaAluno = {
  matriculaId: string;
  courseEditionId: string | null;
  nome: string;
  cpf: string | null;
  curso: string;
  numeroMatricula: string;
  status: string;
  dataMatricula: string | null;
  progresso: number;
  testesFinalizados: number;
  media: Media;
  parcelas: { pagas: number; total: number; lista: Parcela[] };
  convitePendente: boolean;
};

interface Props {
  cursos: { id: string; title: string }[];
  units: { id: string; type: string; name: string; parent_id: string | null }[];
  turmas: TurmaVinculo[];
  appUrl: string;
  turmasFiltroOptions: { id: string; label: string }[];
  linhas: LinhaAluno[];
  novaMatriculaSlot: React.ReactNode;
  baixarParcelaAction: (formData: FormData) => Promise<void> | void;
}

function fmtMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type TipoBusca = "nome" | "cpf" | "matricula";

function BuscaEFiltro({
  tipoBusca, setTipoBusca, busca, setBusca, turmaFiltro, setTurmaFiltro, turmasFiltroOptions, temFiltroAtivo, limpar,
}: {
  tipoBusca: TipoBusca;
  setTipoBusca: (v: TipoBusca) => void;
  busca: string;
  setBusca: (v: string) => void;
  turmaFiltro: string;
  setTurmaFiltro: (v: string) => void;
  turmasFiltroOptions: { id: string; label: string }[];
  temFiltroAtivo: boolean;
  limpar: () => void;
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className="relative">
      {/* 22/09/2026, pedido do Joaquim (imagem 6): a caixa de busca estava
          curta e colada no botão "Nova Matrícula" — aumentada (min-width) e
          o espaçamento entre os dois vem do gap-4 no container pai. */}
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 min-w-[220px] rounded-lg text-xs font-bold border-[1.5px] transition-colors shrink-0 ${
          temFiltroAtivo
            ? "bg-iw-gold/10 text-iw-navy border-iw-gold"
            : "bg-[#FFFFFF] text-iw-navy border-[#CF8403] hover:bg-iw-gold/10"
        }`}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">{busca.trim() ? busca : "Buscar aluno (nome, CPF ou matrícula)"}</span>
        {temFiltroAtivo && <span className="w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" />}
      </button>

      {aberta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberta(false)} />
          <div className="absolute z-50 right-0 top-full mt-1 w-72 bg-white border border-iw-border rounded-xl shadow-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Buscar aluno</span>
              <button type="button" onClick={() => setAberta(false)} className="text-iw-muted hover:text-iw-navy">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-1.5">
              {([
                ["nome", "Nome"],
                ["cpf", "CPF"],
                ["matricula", "Matrícula"],
              ] as [TipoBusca, string][]).map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipoBusca(valor)}
                  className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border transition-colors ${
                    tipoBusca === valor
                      ? "bg-iw-navy text-white border-iw-navy"
                      : "bg-white text-iw-navy border-iw-border hover:bg-iw-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                tipoBusca === "nome" ? "Digite o nome..." : tipoBusca === "cpf" ? "Digite o CPF..." : "Digite a matrícula..."
              }
              autoFocus
              className="w-full border border-iw-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-iw-gold/40"
            />

            <div>
              <label className="block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-1">
                Turma
              </label>
              <select
                value={turmaFiltro}
                onChange={(e) => setTurmaFiltro(e.target.value)}
                className="w-full border border-iw-border rounded-lg px-2.5 py-1.5 text-sm bg-white cursor-pointer"
              >
                <option value="">Todas as turmas</option>
                {turmasFiltroOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {temFiltroAtivo && (
              <button
                type="button"
                onClick={limpar}
                className="w-full text-center text-[11px] font-bold text-iw-muted hover:text-iw-navy py-1"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProfessorPainel({
  cursos, units, turmas, appUrl, turmasFiltroOptions, linhas, novaMatriculaSlot, baixarParcelaAction,
}: Props) {
  const [tipoBusca, setTipoBusca] = useState<TipoBusca>("nome");
  const [busca, setBusca] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // 22/09/2026, pedido do Joaquim: ao dar baixa numa parcela, o professor
  // pode querer só gerar o QR Code Pix pro aluno pagar ali (mesma rotina já
  // validada na área do aluno, utils/financeiro/pix.ts) em vez de já marcar
  // como paga — a baixa em si continua manual e separada (formulário abaixo),
  // exatamente como no portal do aluno: gerar QR nunca confirma pagamento.
  const [pixAbertoId, setPixAbertoId] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  async function alternarQrPix(p: Parcela) {
    if (pixAbertoId === p.id) {
      setPixAbertoId(null);
      setPixQrUrl(null);
      return;
    }
    setPixAbertoId(p.id);
    setPixQrUrl(null);
    setPixCopiado(false);
    const payload = montarPayloadPix({ valorCentavos: p.valor_bruto_centavos, txid: p.id, descricao: p.descricao });
    const url = await QRCodeLib.toDataURL(payload, { margin: 1, width: 220, errorCorrectionLevel: "M" });
    setPixQrUrl(url);
  }

  function copiarCodigoPix(p: Parcela) {
    const payload = montarPayloadPix({ valorCentavos: p.valor_bruto_centavos, txid: p.id, descricao: p.descricao });
    navigator.clipboard.writeText(payload);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  }

  const temFiltroAtivo = busca.trim().length > 0 || turmaFiltro !== "";

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((l) => {
      if (turmaFiltro && l.courseEditionId !== turmaFiltro) return false;
      const q = busca.trim();
      if (!q) return true;
      if (tipoBusca === "cpf") {
        const digitosQ = q.replace(/\D/g, "");
        const digitosCpf = (l.cpf ?? "").replace(/\D/g, "");
        return digitosQ.length > 0 && digitosCpf.includes(digitosQ);
      }
      if (tipoBusca === "matricula") {
        return l.numeroMatricula.toLowerCase().includes(q.toLowerCase());
      }
      return normalizar(l.nome).includes(normalizar(q));
    });
  }, [linhas, busca, tipoBusca, turmaFiltro]);

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="mb-8">
        <TurmasDoProfessor
          cursos={cursos}
          units={units}
          turmas={turmas}
          appUrl={appUrl}
          headerRight={
            <div className="flex items-center gap-4 flex-wrap">
              <BuscaEFiltro
                tipoBusca={tipoBusca}
                setTipoBusca={setTipoBusca}
                busca={busca}
                setBusca={setBusca}
                turmaFiltro={turmaFiltro}
                setTurmaFiltro={setTurmaFiltro}
                turmasFiltroOptions={turmasFiltroOptions}
                temFiltroAtivo={temFiltroAtivo}
                limpar={() => {
                  setBusca("");
                  setTurmaFiltro("");
                }}
              />
              {novaMatriculaSlot}
            </div>
          }
        />
      </div>

      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-iw-navy">Meus alunos</h1>
          <p className="text-iw-muted text-sm mt-1">
            {linhasFiltradas.length} de {linhas.length} aluno{linhas.length === 1 ? "" : "s"}
            {temFiltroAtivo ? " (filtro aplicado)" : " vinculado" + (linhas.length === 1 ? "" : "s") + " a você"}.
          </p>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <GraduationCap className="w-8 h-8 text-iw-muted/40 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhum aluno vinculado a você ainda.</p>
        </div>
      ) : linhasFiltradas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <Search className="w-8 h-8 text-iw-muted/40 mx-auto mb-3" />
          <p className="text-iw-muted text-sm">Nenhum aluno encontrado com esse filtro.</p>
        </div>
      ) : (
        <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-iw-bg border-b border-iw-border text-left">
                <th className="px-4 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider w-8"></th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Nome</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Matrícula</th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider hidden md:table-cell">
                  Curso
                </th>
                <th className="px-2 py-2.5 text-[10px] font-extrabold text-iw-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map((l) => {
                const aberto = expandidos.has(l.matriculaId);
                return (
                  <Fragment key={l.matriculaId}>
                    <tr
                      onClick={() => toggleExpandido(l.matriculaId)}
                      className="border-b border-iw-border/60 last:border-b-0 hover:bg-iw-bg/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-iw-muted">
                        {aberto ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-bold text-iw-navy truncate max-w-[220px]">{l.nome}</p>
                        {l.convitePendente && (
                          <p className="text-[10px] text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> convite pendente
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-iw-navy">{l.numeroMatricula}</td>
                      <td className="px-2 py-2.5 text-iw-navy truncate max-w-[240px] hidden md:table-cell">{l.curso}</td>
                      <td className="px-2 py-2.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FFFFFF] text-iw-navy border-[1.5px] border-[#CF8403]">
                          {l.status}
                        </span>
                      </td>
                    </tr>

                    {aberto && (
                      <tr className="border-b border-iw-border/60 last:border-b-0 bg-iw-bg/40">
                        <td colSpan={5} className="px-5 py-4 space-y-3">
                          {l.convitePendente && (
                            <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] px-2.5 py-2 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                O e-mail de acesso deste aluno não foi entregue. Peça pra ele reabrir o link da
                                turma e preencher de novo com o mesmo CPF — o convite é reenviado automaticamente.
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-iw-muted">Progresso do curso</span>
                                <span className="font-bold text-iw-navy">{l.progresso}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-iw-bg overflow-hidden">
                                <div className="h-full rounded-full bg-iw-blue" style={{ width: `${l.progresso}%` }} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-iw-muted">Testes finalizados</p>
                                <p className="font-bold text-iw-navy">{l.testesFinalizados}</p>
                              </div>
                              <div>
                                <p className="text-iw-muted">Parcelas pagas</p>
                                <p className="font-bold text-iw-navy">
                                  {l.parcelas.pagas}/{l.parcelas.total || "—"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {l.parcelas.lista.length > 0 && (
                            <details className="text-xs border-t border-iw-border pt-2" onClick={(e) => e.stopPropagation()}>
                              <summary className="cursor-pointer list-none flex items-center gap-1.5 font-bold text-iw-navy">
                                <Receipt className="w-3.5 h-3.5 text-iw-gold" /> Ver parcelas
                              </summary>
                              <ul className="mt-2 space-y-1.5">
                                {l.parcelas.lista.map((p) => (
                                  <li key={p.id} className="bg-white rounded-lg px-2.5 py-1.5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-iw-navy truncate">
                                        {p.numero_parcela}/{p.total_parcelas} — {fmtMoeda(p.valor_bruto_centavos)} — vence{" "}
                                        {fmtData(p.data_vencimento)}
                                      </span>
                                      {p.status === "PAGO" ? (
                                        <span className="text-iw-success font-bold shrink-0 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Paga
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => alternarQrPix(p)}
                                            className="flex items-center gap-1 text-[11px] font-bold text-iw-gold hover:text-iw-navy transition-colors"
                                          >
                                            <QrCode className="w-3.5 h-3.5" />
                                            {pixAbertoId === p.id ? "Fechar QR" : "Gerar QR Pix"}
                                          </button>
                                          <form action={baixarParcelaAction} className="flex items-center gap-1">
                                            <input type="hidden" name="id" value={p.id} />
                                            <select
                                              name="forma_pagamento"
                                              className="bg-white border border-iw-border rounded-md px-1.5 py-1 text-[11px]"
                                              defaultValue="PIX"
                                            >
                                              <option value="PIX">Pix</option>
                                              <option value="DEBITO">Débito</option>
                                              <option value="CREDITO">Crédito</option>
                                              <option value="BOLETO">Boleto</option>
                                              <option value="TRANSFERENCIA">Transferência</option>
                                            </select>
                                            <button
                                              type="submit"
                                              className="bg-iw-blue hover:bg-iw-navy text-white font-bold px-2 py-1 rounded-md text-[11px] transition-colors"
                                            >
                                              Dar baixa
                                            </button>
                                          </form>
                                        </div>
                                      )}
                                    </div>

                                    {pixAbertoId === p.id && (
                                      <div
                                        className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <p className="text-[10px] text-iw-muted">
                                          Pix estático — {fmtMoeda(p.valor_bruto_centavos)} para {DADOS_PIX_CETADP.razaoSocial}.
                                          Depois que o aluno pagar, confira e clique em &ldquo;Dar baixa&rdquo; acima — o QR
                                          Code sozinho não confirma o pagamento.
                                        </p>
                                        {pixQrUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={pixQrUrl} alt="QR Code Pix" className="w-28 h-28 rounded-lg bg-white p-1.5 mx-auto" />
                                        ) : (
                                          <p className="text-[10px] text-iw-muted text-center">Gerando QR…</p>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => copiarCodigoPix(p)}
                                          className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-iw-gold/10 border border-iw-border text-iw-navy text-[11px] font-bold py-1.5 rounded-lg transition-colors"
                                        >
                                          {pixCopiado ? <Check className="w-3.5 h-3.5 text-iw-success" /> : <Copy className="w-3.5 h-3.5" />}
                                          {pixCopiado ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
                                        </button>
                                        <p className="text-[10px] text-iw-muted leading-relaxed">
                                          Ou transferência: {DADOS_PIX_CETADP.banco}, agência {DADOS_PIX_CETADP.agencia}, conta{" "}
                                          {DADOS_PIX_CETADP.contaCorrente}, CNPJ {DADOS_PIX_CETADP.cnpjFormatado}.
                                        </p>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {/* 22/09/2026, pedido do Joaquim (imagem 9): antes só dava pra
                                  fechar clicando de novo no "Ver parcelas" — sem aviso nenhum
                                  disso. Botão explícito de fechar, sem precisar lembrar do
                                  truque do clique repetido. */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                }}
                                className="mt-2 text-[11px] font-bold text-iw-muted hover:text-iw-navy"
                              >
                                Fechar parcelas
                              </button>
                            </details>
                          )}

                          <div className="flex items-center gap-2 pt-2 border-t border-iw-border text-xs">
                            {l.media.quantidade === 0 ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-iw-muted/50" />
                                <span className="text-iw-muted">Sem avaliação finalizada ainda</span>
                              </>
                            ) : l.media.aprovado ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-iw-success" />
                                <span className="text-iw-success font-semibold">
                                  Apto ao certificado (média {l.media.media?.toFixed(1)})
                                </span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-iw-error/60" />
                                <span className="text-iw-error font-semibold">
                                  Abaixo do mínimo (média {l.media.media?.toFixed(1)})
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-[10px] text-iw-muted/60">Matriculado em {fmtData(l.dataMatricula)}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
