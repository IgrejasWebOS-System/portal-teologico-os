import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, Package, Boxes, UserPlus, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";

export const metadata = { title: "Admin Loja — CETADP" };

// ============================================================
// /admin/loja — hub de entrada da parte administrativa da Loja.
// Não duplica as telas que já existem (Pedidos, Produtos, Leads);
// só reúne atalhos com um resumo rápido de cada uma, num só lugar.
// ============================================================
export default async function AdminLojaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const [{ count: pedidosAguardando }, { count: produtosAtivos }, { count: produtosEstoqueBaixo }, { count: leadsRegistrados }] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("fulfillment_status", "AGUARDANDO_ENVIO"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "ATIVO"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "ATIVO").not("estoque", "is", null).lte("estoque", 5),
      supabase.from("loja_leads_crm").select("user_id", { count: "exact", head: true }),
    ]);

  const cards = [
    {
      href: "/admin/pedidos",
      icon: Package,
      title: "Pedidos",
      description: "Vendas, envios e entregas da Loja.",
      stat: `${pedidosAguardando ?? 0} aguardando envio`,
      accent: "text-iw-blue bg-iw-blue/10",
    },
    {
      href: "/admin/produtos",
      icon: Boxes,
      title: "Produtos & Estoque",
      description: "Cadastro de produtos, preço e controle de estoque.",
      stat: `${produtosAtivos ?? 0} ativos · ${produtosEstoqueBaixo ?? 0} com estoque baixo`,
      accent: "text-iw-gold bg-iw-gold/10",
    },
    {
      href: "/admin/leads-loja",
      icon: UserPlus,
      title: "Leads",
      description: "Quem comprou avulso e ainda não virou aluno oficial.",
      stat: `${leadsRegistrados ?? 0} no CRM`,
      accent: "text-iw-success bg-iw-success/10",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-iw-navy flex items-center justify-center shrink-0">
          <Store className="w-6 h-6 text-iw-sky" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Admin Loja</h1>
          <p className="text-iw-muted text-sm">
            Vendas, produtos, estoque e leads — tudo que envolve a Loja num só lugar.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-iw-surface border border-iw-border rounded-2xl p-5 flex flex-col gap-3 hover:border-iw-blue/40 hover:shadow-md transition-all duration-150 min-h-[150px]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-iw-navy text-sm uppercase tracking-wide leading-snug">
                  {card.title}
                </p>
              </div>

              <p className="text-xs text-iw-muted leading-relaxed flex-1">{card.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-iw-border">
                <span className="text-xs font-bold text-iw-navy">{card.stat}</span>
                <ChevronRight className="w-4 h-4 text-iw-muted group-hover:text-iw-blue group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-iw-muted">
        Compras/reposição de estoque ainda não têm tela própria — o controle de estoque hoje é feito direto em
        Produtos (entradas e saídas manuais).
      </p>
    </div>
  );
}
