import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata = {
  title: "Pagamento da Matrícula",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

// ============================================================
// /inscricao/pagamento/[id] — destino do back_urls do Mercado Pago
// para a matrícula do curso teológico oficial (quando exige
// pagamento). Não exige login: quem preenche a inscrição ainda não
// tem conta. Por isso a leitura usa o cliente admin (service role) em
// vez de depender de uma política de SELECT pública nova.
//
// O status real só muda quando o webhook confirma o pagamento —
// esta página só reflete o que já está no banco no momento em que é
// carregada (pode aparecer "aguardando" por alguns segundos).
// ============================================================
export default async function PagamentoInscricaoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data: inscricao } = await admin
    .from("ead_inscricoes")
    .select("id, status, preco_matricula_centavos, curso_pretendido")
    .eq("id", id)
    .single();

  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          {!inscricao ? (
            <p className="text-iw-muted text-sm">Inscrição não encontrada.</p>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
                {inscricao.status === "PAGAMENTO_RECUSADO" ? (
                  <XCircle className="w-7 h-7 text-iw-error" />
                ) : inscricao.status === "AGUARDANDO_PAGAMENTO" ? (
                  <Clock className="w-7 h-7 text-iw-gold" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-iw-success" />
                )}
              </div>

              <h1 className="text-xl font-black text-iw-navy mb-2">
                {inscricao.status === "PAGAMENTO_RECUSADO"
                  ? "Pagamento não aprovado"
                  : inscricao.status === "AGUARDANDO_PAGAMENTO"
                    ? "Aguardando confirmação do pagamento"
                    : "Pagamento confirmado!"}
              </h1>

              <p className="text-iw-muted text-sm leading-relaxed mb-2">
                Matrícula — R${" "}
                {(inscricao.preco_matricula_centavos / 100).toFixed(2).replace(".", ",")}
              </p>

              {inscricao.status === "AGUARDANDO_PAGAMENTO" && (
                <p className="text-iw-muted text-xs leading-relaxed mb-6">
                  Isso pode levar alguns segundos. Atualize a página se acabou
                  de pagar.
                </p>
              )}

              {inscricao.status === "PAGAMENTO_RECUSADO" && (
                <div className="mb-6">
                  <p className="text-iw-muted text-xs leading-relaxed mb-3">
                    O Mercado Pago recusou ou cancelou o pagamento. Você pode
                    tentar novamente preenchendo a inscrição de novo.
                  </p>
                  <Link
                    href="/inscricao"
                    className="inline-block bg-iw-gold hover:opacity-90 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-opacity"
                  >
                    Tentar novamente
                  </Link>
                </div>
              )}

              {!["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"].includes(inscricao.status) && (
                <p className="text-iw-muted text-xs leading-relaxed mb-6">
                  Sua matrícula foi paga e a inscrição entrou na fila de
                  análise da secretaria do CETADP. Você receberá o acesso por
                  e-mail assim que for aprovada.
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
