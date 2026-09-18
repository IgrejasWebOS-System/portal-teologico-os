import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoParaImpressao } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Informe IRPF" };

interface PageProps {
  searchParams: Promise<{ ano?: string; alunoId?: string }>;
}

function fmtCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ============================================================
// Informe IRPF — recibo anual consolidado dos pagamentos feitos pelo
// aluno ao CETADP, pra uso na declaração de Imposto de Renda. Decisão
// do Joaquim em 13/09/2026: soma só o que já foi efetivamente PAGO
// (fin_contas_receber.status = 'PAGO'), agrupado por ano civil a partir
// de `pago_em` — não é um novo mecanismo de emissão, só uma leitura
// consolidada do que a secretaria já lançou/baixou em Financeiro.
// Não inclui CNPJ/dados fiscais da instituição por não estarem
// cadastrados no sistema — quem for usar formalmente na declaração deve
// confirmar esses dados com a secretaria antes de enviar à Receita.
// ============================================================
export default async function InformeIrpfPage({ searchParams }: PageProps) {
  const { ano: anoParam, alunoId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoParaImpressao(supabase, user.id, alunoId);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();
  const { data: pagamentos } = await admin
    .from("fin_contas_receber")
    .select("descricao, valor_bruto_centavos, pago_em, numero_parcela, total_parcelas")
    .eq("aluno_user_id", aluno.user_id ?? user.id)
    .eq("status", "PAGO")
    .not("pago_em", "is", null)
    .order("pago_em", { ascending: true });

  const linhas = pagamentos ?? [];
  const anosDisponiveis = Array.from(
    new Set(linhas.map((p) => new Date(p.pago_em as string).getFullYear()))
  ).sort((a, b) => b - a);

  const anoAtual = new Date().getFullYear();
  const anoSelecionado = anoParam && anosDisponiveis.includes(Number(anoParam))
    ? Number(anoParam)
    : anosDisponiveis.includes(anoAtual)
      ? anoAtual
      : anosDisponiveis[0] ?? anoAtual;

  const linhasDoAno = linhas.filter((p) => new Date(p.pago_em as string).getFullYear() === anoSelecionado);
  const totalAnoCentavos = linhasDoAno.reduce((acc, p) => acc + p.valor_bruto_centavos, 0);

  return (
    <ImpressaoShell
      titulo={`Informe de Pagamentos — IRPF ${anoSelecionado}`}
      voltarPara={
        alunoId
          ? `/dashboard/configuracoes/persona/alunos/${alunoId}`
          : matricula?.course_id
            ? `/escola/${matricula.course_id}`
            : "/escola"
      }
    >
      {anosDisponiveis.length > 1 && (
        <div className="print:hidden flex flex-wrap items-center gap-2 mb-6 -mt-2">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ano:</span>
          {anosDisponiveis.map((ano) => (
            <Link
              key={ano}
              href={`/portal/impressao/irpf?ano=${ano}${alunoId ? `&alunoId=${alunoId}` : ""}`}
              className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                ano === anoSelecionado
                  ? "bg-iw-navy text-white border-iw-navy"
                  : "bg-white text-iw-navy border-iw-border hover:border-iw-navy"
              }`}
            >
              {ano}
            </Link>
          ))}
        </div>
      )}

      {linhasDoAno.length === 0 ? (
        <p className="text-sm text-iw-muted">
          {anosDisponiveis.length === 0
            ? "Nenhum pagamento confirmado encontrado ainda — o informe fica disponível assim que a secretaria baixar o primeiro pagamento em Financeiro."
            : `Nenhum pagamento confirmado em ${anoSelecionado}.`}
        </p>
      ) : (
        <>
          <p className="text-sm text-iw-navy leading-relaxed">
            Declaramos, para fins de Imposto de Renda, que <strong>{aluno.nome_completo}</strong>
            {aluno.cpf && <> (CPF {aluno.cpf})</>} efetuou ao Centro Educacional Teológico Assembleia de Deus
            Piracicaba (CETADP), durante o ano-calendário de <strong>{anoSelecionado}</strong>, os pagamentos
            discriminados abaixo, referentes a {matricula?.curso_nome_snapshot ?? "curso teológico"}.
          </p>

          <div className="mt-6 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[480px] text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-iw-navy text-left">
                  <th className="py-2 pr-3 font-bold text-iw-navy">Data</th>
                  <th className="py-2 pr-3 font-bold text-iw-navy">Descrição</th>
                  <th className="py-2 font-bold text-iw-navy text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhasDoAno.map((p, i) => (
                  <tr key={i} className="border-b border-iw-border">
                    <td className="py-2 pr-3">{fmtData(p.pago_em as string)}</td>
                    <td className="py-2 pr-3">
                      {p.descricao}
                      {p.total_parcelas > 1 && (
                        <span className="text-iw-muted"> ({p.numero_parcela}/{p.total_parcelas})</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium">{fmtCentavos(p.valor_bruto_centavos)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-iw-navy">
                  <td colSpan={2} className="py-2 pr-3 font-bold text-iw-navy">
                    Total pago em {anoSelecionado}
                  </td>
                  <td className="py-2 text-right font-black text-iw-navy">{fmtCentavos(totalAnoCentavos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-8 text-sm text-iw-navy">
            Piracicaba-SP, {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.
          </p>

          <div className="mt-10 pt-6 text-center">
            <div className="w-64 mx-auto border-t border-iw-navy pt-2">
              <p className="text-xs text-iw-muted">Secretaria — CETADP</p>
            </div>
          </div>
        </>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado automaticamente pelo Portal do Aluno CETADP a partir dos pagamentos baixados em Financeiro —
        confirme os dados fiscais da instituição com a secretaria antes de anexar à declaração de Imposto de Renda.
      </p>
    </ImpressaoShell>
  );
}
