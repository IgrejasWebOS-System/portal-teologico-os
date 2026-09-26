"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
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
// ============================================================

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    setPagas((prev) => {
      const next = { ...prev };
      for (const n of linhas) next[n] = true;
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
            <div className="flex items-center justify-between gap-3">
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
              <input
                type="date"
                aria-label="Data de referência (início da contagem)"
                value={dataReferencia}
                onChange={(e) => setDataReferencia(e.target.value)}
                className="bg-white border border-iw-border rounded-xl px-2.5 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30"
              />
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

      <div className="space-y-3">
        {linhas.map((n) => {
          const marcada = !!pagas[n];
          const incluiMatricula = n === 1 && valorMatriculaCentavos > 0;
          const valorLinha = valorParcelaCentavos + (incluiMatricula ? valorMatriculaCentavos : 0);
          return (
            <Card key={n} className={marcada ? "border-emerald-300 bg-emerald-50/40" : undefined}>
              <CardBody className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name={`pago_${n}`}
                    value="true"
                    checked={marcada}
                    onChange={(e) => setPagas((prev) => ({ ...prev, [n]: e.target.checked }))}
                    className="w-4 h-4 rounded border-iw-border"
                  />
                  {marcada && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  <span className="text-sm font-bold text-iw-navy">
                    Parcela {n}
                    {incluiMatricula && " + matrícula"}
                  </span>
                </label>
                <span className="text-sm text-iw-muted">{formatarCentavos(valorLinha)}</span>

                {marcada && (
                  <input
                    type="date"
                    name={`data_${n}`}
                    value={datas[n] ?? ""}
                    onChange={(e) => setDatas((prev) => ({ ...prev, [n]: e.target.value }))}
                    className="ml-auto w-[9.5rem] bg-white border border-iw-border rounded-xl px-2.5 py-2 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-1 focus:ring-iw-gold/30"
                  />
                )}

                {marcada && (
                  <SelectInput
                    name={`forma_${n}`}
                    value={formas[n] ?? "DINHEIRO"}
                    onChange={(e) => setFormas((prev) => ({ ...prev, [n]: e.target.value }))}
                    className="max-w-[10rem]"
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Button type="submit" fullWidth loading={pending}>
        Concluir e entrar no curso
      </Button>
    </form>
  );
}
