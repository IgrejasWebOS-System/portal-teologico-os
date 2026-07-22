import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata = {
  title: "Pagamento da Matrícula",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// /matricula/pagamento/[id] — destino do back_urls do Mercado Pago
// para o link de cobrança avulsa gerado na Matrícula Direta
// (/admin/matriculas/nova, opção "Link de pagamento (Mercado Pago)").
// Não exige login: quem paga é o aluno (ou a igreja), a partir de um
// link recebido da secretaria, sem conta própria necessariamente.
//
// O status real só muda quando o webhook confirma o pagamento — esta
// página só reflete o que já está no banco no momento em que é
// carregada (pode aparecer "aguardando" por alguns segundos).
// ============================================================
export default async function PagamentoMatriculaPage({ params }: PageProps) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: conta } = await admin
    .from("fin_contas_receber")
    .select("id, status, descricao, valor_bruto_centavos")
    .eq("id", id)
    .single();

  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          {!conta ? (
            <p className="text-iw-muted text-sm">Cobrança não encontrada.</p>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
                {conta.status === "PAGO" ? (
                  <CheckCircle2 className="w-7 h-7 text-iw-success" />
                ) : (
                  <Clock className="w-7 h-7 text-iw-gold" />
                )}
              </div>

              <h1 className="text-xl font-black text-iw-navy mb-2">
                {conta.status === "PAGO" ? "Pagamento confirmado!" : "Aguardando confirmação do pagamento"}
              </h1>

              <p className="text-iw-muted text-sm leading-relaxed mb-2">{conta.descricao}</p>
              <p className="text-iw-muted text-sm leading-relaxed mb-2">
                R$ {(conta.valor_bruto_centavos / 100).toFixed(2).replace(".", ",")}
              </p>

              {conta.status !== "PAGO" && (
                <p className="text-iw-muted text-xs leading-relaxed mb-6">
                  Isso pode levar alguns segundos. Atualize a página se acabou de pagar.
                </p>
              )}

              {conta.status === "PAGO" && (
                <p className="text-iw-muted text-xs leading-relaxed mb-6">
                  A secretaria do CETADP já recebeu a confirmação do pagamento.
                </p>
              )}
            </>
          )}

          <Link
            href="/"
            className="inline-block mt-2 border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Voltar para o início
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
