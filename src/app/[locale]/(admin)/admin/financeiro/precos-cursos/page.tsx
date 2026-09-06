import { redirect } from "next/navigation";
import { Tag, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import { salvarPrecoCursoAction } from "./actions";

export const metadata = { title: "Preços dos cursos — CETADP" };

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PrecosCursosPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  // Só a Escola Teológica (Básico/Médio) tem plano de pagamento fixo —
  // os demais cursos (module = "cursos") são avulsos/preparatórios e
  // já têm preço próprio via Loja (tabela products), fora deste escopo.
  const { data: cursos } = await supabase
    .from("courses")
    .select("id, title")
    .eq("module", "escola")
    .order("title");

  const { data: precos } = await supabase.from("course_pricing").select("*");
  const precoPorCurso = new Map((precos ?? []).map((p) => [p.course_id, p]));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={Tag}
        title="Preços dos cursos"
        description="Valor de matrícula e parcelas, por curso — único lugar onde isso é definido. Nova Matrícula e Ficha Rápida usam esses valores automaticamente ao selecionar o curso."
        backHref="/admin/financeiro"
        backLabel="Voltar para Financeiro"
      />

      {msg && (
        <div className="flex items-center gap-3 bg-iw-success-bg border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{decodeURIComponent(msg)}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{decodeURIComponent(error)}</span>
        </div>
      )}

      {(cursos ?? []).map((curso) => {
        const preco = precoPorCurso.get(curso.id);
        const valorMatricula = preco?.valor_matricula_centavos ?? 0;
        const valorParcela = preco?.valor_parcela_centavos ?? 0;
        const numeroParcelas = preco?.numero_parcelas ?? 12;
        const valorTotal = valorMatricula + valorParcela * numeroParcelas;

        return (
          <form
            key={curso.id}
            action={salvarPrecoCursoAction}
            className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4"
          >
            <input type="hidden" name="course_id" value={curso.id} />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-bold text-iw-navy">{curso.title}</h2>
              <span className="text-sm font-bold text-iw-gold">Total: {fmt(valorTotal)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30">
                <label className="block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5">
                  Valor da matrícula (opcional)
                </label>
                <input
                  name="valor_matricula"
                  defaultValue={(valorMatricula / 100).toFixed(2).replace(".", ",")}
                  placeholder="Ex: 25,00"
                  className="w-full bg-transparent border-none p-0 text-sm text-iw-navy focus:outline-none focus:ring-0"
                />
              </div>
              <div className="border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30">
                <label className="block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5">
                  Valor da parcela *
                </label>
                <input
                  name="valor_parcela"
                  required
                  defaultValue={(valorParcela / 100).toFixed(2).replace(".", ",")}
                  placeholder="Ex: 65,00"
                  className="w-full bg-transparent border-none p-0 text-sm text-iw-navy focus:outline-none focus:ring-0"
                />
              </div>
              <div className="border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30">
                <label className="block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5">
                  Nº de parcelas (máx. 12)
                </label>
                <input
                  name="numero_parcelas"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={numeroParcelas}
                  className="w-full bg-transparent border-none p-0 text-sm text-iw-navy focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <p className="text-xs text-iw-muted">
              {valorMatricula > 0
                ? `Ex.: matrícula de ${fmt(valorMatricula)} + ${numeroParcelas}x de ${fmt(valorParcela)}.`
                : `Ex.: ${numeroParcelas}x de ${fmt(valorParcela)}, sem matrícula separada.`}
            </p>

            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity border border-black"
            >
              Salvar
            </button>
          </form>
        );
      })}

      {(!cursos || cursos.length === 0) && (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum curso da Escola Teológica encontrado.</p>
        </div>
      )}
    </div>
  );
}
