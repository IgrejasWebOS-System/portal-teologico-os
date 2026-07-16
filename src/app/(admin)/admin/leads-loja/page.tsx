import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Phone, ShoppingBag } from "lucide-react";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { atualizarStatusLeadAction } from "./actions";

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
  status: string;
  observacao: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  NAO_CONTATADO: "Não contatado",
  CONTATADO: "Contatado",
  CONVERTIDO: "Convertido",
  SEM_INTERESSE: "Sem interesse",
};

const STATUS_CLS: Record<string, string> = {
  NAO_CONTATADO: "bg-iw-bg text-iw-muted border-iw-border",
  CONTATADO: "bg-iw-blue/10 text-iw-blue border-iw-blue/30",
  CONVERTIDO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  SEM_INTERESSE: "bg-iw-error-bg text-iw-error border-iw-error/30",
};

function formatarPreco(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string; status?: string }>;
}

// ============================================================
// /admin/leads-loja — compradores da Loja que ainda NÃO têm
// matrícula como aluno do CETADP, com um funil de contato simples
// (loja_leads_crm): a secretaria marca o status e pode deixar uma
// observação, direto na própria lista.
// ============================================================
export default async function LeadsLojaPage({ searchParams }: PageProps) {
  const { msg, error, status: filtroStatus } = await searchParams;

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

  const { data: crmRaw } = await admin.from("loja_leads_crm").select("user_id, status, observacao");
  const crmMap = new Map((crmRaw ?? []).map((c) => [c.user_id, c]));

  const porComprador = new Map<string, Lead>();

  for (const pedido of (pedidos ?? []) as unknown as PedidoRow[]) {
    if (!pedido.user_id || idsComMatricula.has(pedido.user_id)) continue;

    const itens = (pedido.order_items ?? []).map((i) => `${i.quantidade}x ${i.titulo_snapshot}`);

    const existente = porComprador.get(pedido.user_id);
    if (existente) {
      existente.totalGastoCentavos += pedido.total_centavos;
      existente.numeroPedidos += 1;
      existente.itens.push(...itens);
      if (pedido.created_at > existente.ultimaCompraEm) {
        existente.ultimaCompraEm = pedido.created_at;
      }
    } else {
      const crm = crmMap.get(pedido.user_id);
      porComprador.set(pedido.user_id, {
        userId: pedido.user_id,
        nome: pedido.nome_comprador || "Não informado",
        email: pedido.email_comprador || "—",
        telefone: pedido.telefone_comprador,
        totalGastoCentavos: pedido.total_centavos,
        numeroPedidos: 1,
        ultimaCompraEm: pedido.created_at,
        itens,
        status: crm?.status ?? "NAO_CONTATADO",
        observacao: crm?.observacao ?? null,
      });
    }
  }

  const todosLeads = [...porComprador.values()].sort((a, b) => (a.ultimaCompraEm < b.ultimaCompraEm ? 1 : -1));

  const contagem = {
    NAO_CONTATADO: todosLeads.filter((l) => l.status === "NAO_CONTATADO").length,
    CONTATADO: todosLeads.filter((l) => l.status === "CONTATADO").length,
    CONVERTIDO: todosLeads.filter((l) => l.status === "CONVERTIDO").length,
    SEM_INTERESSE: todosLeads.filter((l) => l.status === "SEM_INTERESSE").length,
  };

  const filtro = filtroStatus ?? "TODOS";
  const leads = filtro === "TODOS" ? todosLeads : todosLeads.filter((l) => l.status === filtro);

  const abas: { key: string; label: string }[] = [
    { key: "TODOS", label: `Todos (${todosLeads.length})` },
    { key: "NAO_CONTATADO", label: `Não contatado (${contagem.NAO_CONTATADO})` },
    { key: "CONTATADO", label: `Contatado (${contagem.CONTATADO})` },
    { key: "CONVERTIDO", label: `Convertido (${contagem.CONVERTIDO})` },
    { key: "SEM_INTERESSE", label: `Sem interesse (${contagem.SEM_INTERESSE})` },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">Leads da Loja</h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Compradores avulsos ainda não matriculados — funil de contato para convidar à formação teológica.
          </p>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Não contatados</p>
          <p className="text-lg font-black text-iw-navy">{contagem.NAO_CONTATADO}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Contatados</p>
          <p className="text-lg font-black text-iw-blue">{contagem.CONTATADO}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Convertidos</p>
          <p className="text-lg font-black text-iw-success">{contagem.CONVERTIDO}</p>
        </div>
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold text-iw-muted uppercase">Sem interesse</p>
          <p className="text-lg font-black text-iw-error">{contagem.SEM_INTERESSE}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <Link
            key={a.key}
            href={`/admin/leads-loja?status=${a.key}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filtro === a.key
                ? "bg-iw-navy text-white"
                : "bg-iw-surface border border-iw-border text-iw-muted hover:text-iw-navy"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum lead nesse filtro.</p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-iw-navy">{lead.nome}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_CLS[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </div>
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
                  <p className="font-black text-iw-navy">{formatarPreco(lead.totalGastoCentavos)}</p>
                  <p className="text-[11px] text-iw-muted">
                    {lead.numeroPedidos} pedido{lead.numeroPedidos > 1 ? "s" : ""} · última compra em{" "}
                    {formatarData(lead.ultimaCompraEm)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-iw-border">
                <p className="text-xs text-iw-muted flex items-start gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {lead.itens.join(" · ")}
                </p>
              </div>

              {lead.observacao && (
                <p className="text-xs text-iw-navy bg-iw-bg rounded-lg px-3 py-2 italic">“{lead.observacao}”</p>
              )}

              <details className="pt-1">
                <summary className="cursor-pointer list-none text-xs font-bold text-iw-blue hover:opacity-80">
                  Atualizar status de contato
                </summary>
                <form action={atualizarStatusLeadAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-3">
                  <input type="hidden" name="user_id" value={lead.userId} />
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="sm:col-span-2 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm cursor-pointer"
                  >
                    <option value="NAO_CONTATADO">Não contatado</option>
                    <option value="CONTATADO">Contatado</option>
                    <option value="CONVERTIDO">Convertido</option>
                    <option value="SEM_INTERESSE">Sem interesse</option>
                  </select>
                  <input
                    name="observacao"
                    defaultValue={lead.observacao ?? ""}
                    placeholder="Observação (opcional)"
                    className="sm:col-span-3 bg-white border border-iw-border rounded-xl px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-1 bg-iw-navy text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Salvar
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
