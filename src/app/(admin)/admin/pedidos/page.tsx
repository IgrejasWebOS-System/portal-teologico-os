import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Package, MapPin } from "lucide-react";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { marcarComoEnviadoAction, marcarComoEntregueAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  AGUARDANDO_ENVIO: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  ENVIADO: "bg-iw-blue/10 text-iw-blue border-iw-blue/30",
  ENTREGUE: "bg-iw-success-bg text-iw-success border-iw-success/30",
};

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_ENVIO: "Aguardando envio",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

interface Endereco {
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

// ============================================================
// /admin/pedidos — gestão de pedidos com material físico
// (livraria/biblioteca). Só mostra pedidos que têm pelo menos um
// item MATERIAL_FISICO e que já foram pagos (fulfillment_status
// só é diferente de NAO_APLICAVEL quando há item físico — ver
// checkout/actions.ts). A secretaria só marca separado → enviado →
// entregue; a confirmação do pagamento em si é automática, via
// webhook do Mercado Pago.
// ============================================================
export default async function PedidosAdminPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const { data: pedidos } = await supabase
    .from("orders")
    .select(
      "id, status, total_centavos, fulfillment_status, endereco_entrega, created_at, nome_comprador, email_comprador, order_items(titulo_snapshot, quantidade)"
    )
    .neq("fulfillment_status", "NAO_APLICAVEL")
    .eq("status", "PAGO")
    .order("created_at", { ascending: false });

  const ORDEM_STATUS: Record<string, number> = { AGUARDANDO_ENVIO: 0, ENVIADO: 1, ENTREGUE: 2 };
  const lista = [...(pedidos ?? [])].sort(
    (a, b) => (ORDEM_STATUS[a.fulfillment_status] ?? 9) - (ORDEM_STATUS[b.fulfillment_status] ?? 9)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">
            Pedidos — Material Físico
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Pedidos pagos com item físico da Loja. Marque como enviado e
            depois como entregue conforme o andamento.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum pedido físico pago no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((pedido) => {
            const endereco = (pedido.endereco_entrega ?? {}) as Endereco;
            const itens = (pedido.order_items ?? []) as unknown as { titulo_snapshot: string; quantidade: number }[];

            return (
              <div
                key={pedido.id}
                className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-iw-navy">
                      {pedido.nome_comprador || pedido.email_comprador || "Comprador"}
                    </p>
                    <p className="text-xs text-iw-muted mt-0.5">
                      Pedido #{pedido.id.slice(0, 8)} · R${" "}
                      {(pedido.total_centavos / 100).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[pedido.fulfillment_status] ?? STATUS_STYLE.AGUARDANDO_ENVIO}`}
                  >
                    {STATUS_LABEL[pedido.fulfillment_status] ?? pedido.fulfillment_status}
                  </span>
                </div>

                <ul className="text-xs text-iw-muted list-disc list-inside">
                  {itens.map((item, idx) => (
                    <li key={idx}>
                      {item.quantidade}x {item.titulo_snapshot}
                    </li>
                  ))}
                </ul>

                {endereco.rua && (
                  <p className="text-xs text-iw-muted flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {endereco.rua}, {endereco.numero}
                    {endereco.complemento ? ` — ${endereco.complemento}` : ""} —{" "}
                    {endereco.bairro}, {endereco.cidade}/{endereco.uf} — CEP {endereco.cep}
                  </p>
                )}

                {pedido.fulfillment_status !== "ENTREGUE" && (
                  <div className="flex items-center gap-3 pt-2 border-t border-iw-border mt-1">
                    {pedido.fulfillment_status === "AGUARDANDO_ENVIO" && (
                      <form action={marcarComoEnviadoAction}>
                        <input type="hidden" name="id" value={pedido.id} />
                        <button
                          type="submit"
                          className="bg-iw-blue text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Marcar como enviado
                        </button>
                      </form>
                    )}
                    {pedido.fulfillment_status === "ENVIADO" && (
                      <form action={marcarComoEntregueAction}>
                        <input type="hidden" name="id" value={pedido.id} />
                        <button
                          type="submit"
                          className="bg-iw-success text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Marcar como entregue
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
