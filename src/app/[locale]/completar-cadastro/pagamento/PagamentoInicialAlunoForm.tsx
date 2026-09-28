"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { Button, Card, CardBody, Label, SelectInput } from "@/components/ui";

// ============================================================
// Formulário de conferência de mensalidades no primeiro acesso do aluno
// (20/09/2026, pedido do Joaquim). Regra confirmada por ele:
// "Quantos meses já decorridos ele já pagou" — o valor da parcela é
// SEMPRE fixo (course_pricing.valor_parcela_centavos), o aluno só ajusta
// QUANTAS parcelas aparecem pra conferência (nunca mais que o sugerido
// pelos meses já decorridos desde o início da turma, nunca mais que o
// total de parcelas do curso). O plano completo de 12 parcelas é gerado
// no servidor de qualquer forma — aqui só decide quais nascem PAGO.
//
// 28/09/2026, pedido do Joaquim: layout redesenhado pra seguir o mesmo
// padrão visual do modal "Confirmar parcelas da matrícula"
// (admin/matriculas/nova/ConfirmarParcelasModal.tsx) — tabela única com
// Parcela/Vencimento/Valor/Já paga e um resumo do total já pago no
// rodapé, em vez da lista de cartões avulsos de antes. Nenhum campo do
// formulário mudou de nome (pago_N, data_N, forma_N, total_parcelas_
// exibidas, data_inicio) — salvarPagamentoInicialAlunoAction continua
// igual.
// ============================================================

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBr(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

// 27/09/2026, pedido do Joaquim: pra matrículas antigas (retroativas), cada
// parcela marcada como paga deve vir com a data do seu próprio mês de
// vencimento (1º vencimento + N-1 meses), não a data de hoje — antes, ao
// usar "Selecionar todas" sem digitar uma data por linha, todas as parcelas
// caíam com `pago_em` = agora, e o Caixa mostrava tudo "pago hoje".
function somarMesesIso(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + meses, dia));
  return d.toISOString().slice(0, 10);
}

const FORMAS_PAGAMENTO = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
];

interface Props {
  action: (formData: FormData) => Promise<void> | void;
  cursoNome: string;
  valorMatriculaCentavos: number;
  valorParcelaCentavos: number;
  numeroParcelasCurso: number;
  totalParcelasSugerido: number;
  primeiroVencimento: string;
}

export default function PagamentoInicialAlunoForm({
  action,
  cursoNome,
  valorMatriculaCentavos,
  valorParcelaCentavos,
  numeroParcelasCurso,
  totalParcelasSugerido,
  primeiroVencimento,
}: Props) {
  const [totalParcelas, setTotalParcelas] = useState(totalParcelasSugerido);
  const [pagas, setPagas] = useState<Record<number, boolean>>({});
  const [formas, setFormas] = useState<Record<number, string>>({});
  const [datas, setDatas] = useState<Record<number, string>>({});
  // 26/09/2026, pedido do Joaquim: campo de data visível entre o seletor de
  // meses e o botão "Selecionar todas" — vem pré-preenchido com a mesma
  // data informada pelo aluno no link de inscrição ("Desde quando você já
  // cursa?", matricula-turma) e pode ser ajustado aqui se precisar.
  const [dataReferencia, setDataReferencia] = useState(primeiroVencimento);
  const [pending, startTransition] = useTransition();

  const linhas = Array.from({ length: totalParcelas }, (_, i) => i + 1);

  // 25/09/2026, pedido do Joaquim: em vez de clicar parcela por parcela,
  // o aluno escolhe quantos meses já pagou e clica um botão só que marca
  // todas de uma vez (1..totalParcelas) como pagas.
  function selecionarTodas() {
    const referencia = dataReferencia || primeiroVencimento;
    setPagas((prev) => {
      const next = { ...prev };
      for (const n of linhas) next[n] = true;
      return next;
    });
    setDatas((prev) => {
      const next = { ...prev };
      for (const n of linhas) {
        // Só preenche automaticamente quem ainda não tem data digitada à
        // mão — não sobrescreve um ajuste manual que o aluno já tenha feito.
        if (!next[n]) next[n] = somarMesesIso(referencia, n - 1);
      }
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("total_parcelas_exibidas", String(totalParcelas));
    formData.set("data_inicio", dataReferencia || primeiroVencimento);
    startTransition(() => {
      action(formData);
    });
  }

  // 28/09/2026: resumo do total já pago, mesmo cálculo de
  // ConfirmarParcelasModal.tsx (soma só as linhas marcadas), mostrado no
  // rodapé da tabela abaixo.
  const totalPagoCentavos = linhas.reduce((acc, n) => {
    if (!pagas[n]) return acc;
    const incluiMatricula = n === 1 && valorMatriculaCentavos > 0;
    return acc + valorParcelaCentavos + (incluiMatricula ? valorMatriculaCentavos : 0);
  }, 0);

  return (
    <form action={handleSubmit} className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div>
            <p className="text-sm font-bold text-iw-navy">{cursoNome}</p>
            <p className="text-xs text-iw-muted mt-0.5">
              Mensalidade: {formatarCentavos(valorParcelaCentavos)}
              {valorMatriculaCentavos > 0 && ` · Matrícula: ${formatarCentavos(valorMatriculaCentavos)} (junto com a 1ª parcela)`}
            </p>
          </div>

          <div>
            <Label htmlFor="qtd_parcelas">Quantos meses já decorridos você já pagou?</Label>
            {/* 26/09/2026, pedido do Joaquim: botão "Selecionar todas" na
                extremidade direita (justify-between), e no meio um campo de
                data — vem preenchido com a data informada no link de
                inscrição (matricula-turma), editável se precisar ajustar. */}
            <div className="flex items-end justify-between gap-3">
              <SelectInput
                id="qtd_parcelas"
                value={totalParcelas}
                onChange={(e) => setTotalParcelas(Number(e.target.value))}
                className="max-w-[10rem]"
              >
                {Array.from({ length: Math.min(totalParcelasSugerido, numeroParcelasCurso) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "mês" : "meses"}
                  </option>
                ))}
              </SelectInput>
              <div className="flex flex-col gap-0.5">
                {/* 27/09/2026, pedido do Joaquim: o campo não tinha label
                    visível — só dava pra saber o que era pelo aria-label. É a
                    partir desta data que os vencimentos das demais parcelas
                    são contados (mesma data informada em "Desde quando você
                    já cursa?" no link de inscrição). */}
                <label className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">
                  Data do 1º pagamento/vencimento
                </label>
                <input
                  type="date"
                  aria-label="Data do 1º pagamento/vencimento"
                  value={dataReferencia}
                  onChange={(e) => setDataReferencia(e.target.value)}
                  className="bg-white border border-iw-border rounded-xl px-2.5 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30"
                />
              </div>
              <Button type="button" variant="secondary" onClick={selecionarTodas} className="ml-auto">
                Selecionar todas
              </Button>
            </div>
            <p className="text-xs text-iw-muted mt-1">
              Não é possível conferir mais meses do que já decorreram desde o início da turma.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* 28/09/2026, pedido do Joaquim: tabela única + resumo no rodapé,
          mesmo padrão visual de ConfirmarParcelasModal.tsx (Nova Matrícula
          Direta) — antes cada parcela era um cartão avulso, sem totalizador
          nenhum. */}
      <div className="bg-iw-surface border border-iw-gold rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-iw-border flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-iw-gold shrink-0" />
          <p className="text-xs text-iw-muted">
            Parcelas com vencimento até hoje já vêm marcadas como pagas — desmarque as que ainda não
            foram quitadas. As com vencimento futuro vêm desmarcadas.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-iw-bg border-b border-iw-border text-left">
                <th className="px-3 py-2 text-[10px] font-extrabold text-iw-navy uppercase tracking-wider">Parcela</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-iw-navy uppercase tracking-wider">Vencimento</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-iw-navy uppercase tracking-wider">Valor</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-iw-navy uppercase tracking-wider">Forma / data do pagamento</th>
                <th className="px-3 py-2 text-[10px] font-extrabold text-iw-navy uppercase tracking-wider text-center">Já paga</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((n) => {
                const marcada = !!pagas[n];
                const incluiMatricula = n === 1 && valorMatriculaCentavos > 0;
                const valorLinha = valorParcelaCentavos + (incluiMatricula ? valorMatriculaCentavos : 0);
                const vencimentoIso = somarMesesIso(dataReferencia || primeiroVencimento, n - 1);
                return (
                  <tr key={n} className={`border-b border-iw-border/60 last:border-b-0 ${marcada ? "bg-emerald-50/50" : ""}`}>
                    <td className="px-3 py-2 text-iw-navy font-bold whitespace-nowrap">
                      Parcela {n}
                      {incluiMatricula && " + matrícula"}
                    </td>
                    <td className="px-3 py-2 text-iw-navy whitespace-nowrap">{fmtDataBr(vencimentoIso)}</td>
                    <td className="px-3 py-2 text-iw-navy whitespace-nowrap">{formatarCentavos(valorLinha)}</td>
                    <td className="px-3 py-2">
                      {marcada ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            name={`data_${n}`}
                            value={datas[n] ?? ""}
                            onChange={(e) => setDatas((prev) => ({ ...prev, [n]: e.target.value }))}
                            className="w-[9.5rem] bg-white border border-iw-border rounded-xl px-2.5 py-1.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30"
                          />
                          <SelectInput
                            name={`forma_${n}`}
                            value={formas[n] ?? "DINHEIRO"}
                            onChange={(e) => setFormas((prev) => ({ ...prev, [n]: e.target.value }))}
                            className="max-w-[9rem]"
                          >
                            {FORMAS_PAGAMENTO.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </SelectInput>
                        </div>
                      ) : (
                        <span className="text-iw-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        name={`pago_${n}`}
                        value="true"
                        checked={marcada}
                        onChange={(e) => {
                          const checou = e.target.checked;
                          setPagas((prev) => ({ ...prev, [n]: checou }));
                          if (checou) {
                            setDatas((prev) =>
                              prev[n] ? prev : { ...prev, [n]: somarMesesIso(dataReferencia || primeiroVencimento, n - 1) }
                            );
                          }
                        }}
                        className="w-4 h-4 accent-iw-gold cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-iw-border bg-iw-bg">
          <p className="text-xs text-iw-navy">
            {totalPagoCentavos > 0 ? (
              <>Já paga: <strong>{formatarCentavos(totalPagoCentavos)}</strong></>
            ) : (
              "Nenhuma parcela marcada como paga."
            )}
          </p>
        </div>
      </div>

      <Button type="submit" fullWidth loading={pending}>
        Concluir e entrar no curso
      </Button>
    </form>
  );
}
