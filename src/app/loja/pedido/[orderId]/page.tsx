import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Meu Pedido",
};

// ============================================================
// /loja/pedido/[orderId] — destino do back_urls do Mercado Pago
// (e também para onde o comprador pode voltar depois). O status
// real do pedido só muda quando o webhook confirma o pagamento —
// esta página apenas reflete o que já está no banco no momento em
// que é carregada (pode aparecer "aguardando pagamento" por alguns
// segundos até o webhook processar).
// Versão mínima — o catálogo/carrinho completo (#42) fica mais
// elaborado; esta é só o bridge necessário para o checkout funcionar.
// ============================================================
export default async function PedidoPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pedido } = await supabase
    .from("orders")
    .select("id, status, total_centavos, fulfillment_status, created_at")
    .eq("id", orderId)
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

          {!pedido ? (
            <p className="text-iw-muted text-sm">Pedido não encontrado.</p>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
                {pedido.status === "PAGO" ? (
                  <CheckCircle2 className="w-7 h-7 text-iw-success" />
                ) : pedido.status === "CANCELADO" || pedido.status === "REEMBOLSADO" ? (
                  <XCircle className="w-7 h-7 text-iw-error" />
                ) : (
                  <Clock className="w-7 h-7 text-iw-gold" />
                )}
              </div>

              <h1 className="text-xl font-black text-iw-navy mb-2">
                {pedido.status === "PAGO"
                  ? "Pagamento confirmado!"
                  : pedido.status === "CANCELADO"
                    ? "Pagamento não aprovado"
                    : pedido.status === "REEMBOLSADO"
                      ? "Pedido reembolsado"
                      : "Aguardando confirmação do pagamento"}
              </h1>

              <p className="text-iw-muted text-sm leading-relaxed mb-2">
                Pedido #{pedido.id.slice(0, 8)} — R${" "}
                {(pedido.total_centavos / 100).toFixed(2).replace(".", ",")}
              </p>

              {pedido.status === "AGUARDANDO_PAGAMENTO" && (
                <p className="text-iw-muted text-xs leading-relaxed mb-6">
                  Isso pode levar alguns segundos. Atualize a página se acabou
                  de pagar.
                </p>
              )}
            </>
          )}

          <Link
            href="/portal"
            className="inline-block mt-4 border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Ir para o Portal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
