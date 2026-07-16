import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UserPlus, Mail, Phone, ShoppingBag } from "lucide-react";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

interface PedidoItem {
  titulo_snapshot: string;
  quantidade: number;
}

interface PedidoRow {
  id: string;
  user_id: string;
  total_centavos: number;
  created_at: string;
  nome_comprador: string | null;
  email_comprador: string | null;
  telefone_comprador: string | null;
  order_items: PedidoItem[];
}

interface Lead {
  userId: string;
  nome: string;
  email: string;
  telefone: string | null;
  totalGastoCentavos: number;
  numeroPedidos: number;
  ultimaCompraEm: string;
  itens: string[];
}

function formatarPreco(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ============================================================
// /admin/leads-loja — compradores da Loja (livros, apostilas,
// cursos avulsos, PDFs) que ainda NÃO têm nenhuma matrícula como
// aluno do CETADP. Objetivo: dar à secretaria uma lista de contato
// pronta (nome, e-mail, telefone já coletados no checkout) para
// abordar esse comprador avulso e convidá-lo a se tornar aluno.
// ============================================================
export default async function LeadsLojaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const admin = createAdminClient();

  const { data: pedidos } = await admin
    .from("orders")
    .select(
      "id, user_id, total_centavos, created_at, nome_comprador, email_comprador, telefone_comprador, order_items(titulo_snapshot, quantidade)"
    )
    .eq("status", "PAGO")
    .order("created_at", { ascending: false });

  const { data: alunos } = await admin.from("ead_alunos").select("user_id");
  const idsComMatricula = new Set((alunos ?? []).map((a) => a.user_id).filter(Boolean));

  const porComprador = new Map<string, Lead>();

  for (const pedido of (pedidos ?? []) as unknown as PedidoRow[]) {
    if (!pedido.user_id || idsComMatricula.has(pedido.user_id)) continue;

    const itens = (pedido.order_items ?? []).map(
      (i) => `${i.quantidade}x ${i.titulo_snapshot}`
    );

    const existente = porComprador.get(pedido.user_id);
    if (existente) {
      existente.totalGastoCentavos += pedido.total_centavos;
      existente.numeroPedidos += 1;
      existente.itens.push(...itens);
      if (pedido.created_at > existente.ultimaCompraEm) {
        existente.ultimaCompraEm = pedido.created_at;
      }
    } else {
      porComprador.set(pedido.user_id, {
        userId: pedido.user_id,
        nome: pedido.nome_comprador || "Não informado",
        email: pedido.email_comprador || "—",
        telefone: pedido.telefone_comprador,
        totalGastoCentavos: pedido.total_centavos,
        numeroPedidos: 1,
        ultimaCompraEm: pedido.created_at,
        itens,
      });
    }
  }

  const leads = [...porComprador.values()].sort(
    (a, b) => (a.ultimaCompraEm < b.ultimaCompraEm ? 1 : -1)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">
            Leads da Loja
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Compradores da loja (livros, apostilas, cursos avulsos, PDFs) que
            ainda não são alunos matriculados — oportunidade de contato para
            convidar à formação teológica.
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">
            Nenhum comprador avulso pendente de contato no momento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {leads.map((lead) => (
            <div
              key={lead.userId}
              className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-iw-navy">{lead.nome}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="text-xs text-iw-muted flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {lead.email}
                    </span>
                    {lead.telefone && (
                      <span className="text-xs text-iw-muted flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-iw-navy">
                    {formatarPreco(lead.totalGastoCentavos)}
                  </p>
                  <p className="text-[11px] text-iw-muted">
                    {lead.numeroPedidos} pedido{lead.numeroPedidos > 1 ? "s" : ""} · última
                    compra em {formatarData(lead.ultimaCompraEm)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-iw-border">
                <p className="text-xs text-iw-muted flex items-start gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {lead.itens.join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
