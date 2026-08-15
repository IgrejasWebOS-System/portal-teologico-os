import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Church,
  DollarSign,
  AlertCircle,
  UserPlus,
  CalendarClock,
  List,
  Cake,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";

export const metadata = { title: "Visão Geral — Igreja" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatBirthDate(iso: string | null): string {
  if (!iso) return "—";
  // birth_date stored as "YYYY-MM-DD" text
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function daysUntilBirthday(iso: string | null): number {
  if (!iso) return 999;
  const [, mm, dd] = iso.split("-").map(Number);
  const today = new Date();
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, mm - 1, dd);
  if (next < today) next = new Date(thisYear + 1, mm - 1, dd);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── KPIs ──────────────────────────────────────────────────
  const { count: totalMembers } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  const { count: pendingMembers } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("financial_status", "PENDING")
    .eq("status", "ACTIVE");

  const { count: totalChurches } = await supabase
    .from("churches")
    .select("id", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount_paid")
    .gte("payment_date", startOfMonth);

  const monthlyRevenue =
    transactions?.reduce((acc, t) => acc + Number(t.amount_paid), 0) ?? 0;

  // ── Aniversariantes do mês ─────────────────────────────────
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const { data: birthdayMembers } = await supabase
    .from("members")
    .select("id, full_name, birth_date, ecclesiastical_roles(name)")
    .like("birth_date", `%-${currentMonth}-%`)
    .eq("status", "ACTIVE")
    .order("birth_date")
    .limit(12);

  // Ordena por dia do aniversário para mostrar os mais próximos primeiro
  const sortedBirthdays = (birthdayMembers ?? []).sort(
    (a, b) => daysUntilBirthday(a.birth_date) - daysUntilBirthday(b.birth_date)
  );

  const todayBirthdays = sortedBirthdays.filter(
    (m) => daysUntilBirthday(m.birth_date) === 0
  );

  // ── Últimos membros cadastrados ────────────────────────────
  const { data: recentMembers } = await supabase
    .from("members")
    .select(
      "id, full_name, status, financial_status, created_at, ecclesiastical_roles(name)"
    )
    .order("created_at", { ascending: false })
    .limit(6);

  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  const currentMonthName = monthNames[new Date().getMonth()];

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-black text-iw-navy tracking-tight">
          Visão Geral — Igreja
        </h1>
        <p className="text-iw-muted text-sm">Panorama do ministério em tempo real.</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Membros Ativos"
          value={totalMembers ?? 0}
          subtitle="No rol de membros"
          icon={<Users className="w-full h-full" />}
          accent="blue"
        />
        <StatCard
          title="Igrejas no Setor"
          value={totalChurches ?? 0}
          subtitle="Congregações sob gestão"
          icon={<Church className="w-full h-full" />}
          accent="blue"
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(monthlyRevenue)}
          subtitle="Transações no mês corrente"
          icon={<DollarSign className="w-full h-full" />}
          accent="success"
        />
        <StatCard
          title="Pendências"
          value={pendingMembers ?? 0}
          subtitle="Membros com situação pendente"
          icon={<AlertCircle className="w-full h-full" />}
          accent={pendingMembers && pendingMembers > 0 ? "error" : "success"}
        />
      </div>

      {/* ── Ações Rápidas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/dashboard/membros/novo"
          className="group bg-iw-surface rounded-[var(--radius-xl)] border border-iw-blue/20 shadow-[var(--shadow-sm)] p-6 flex items-start gap-4 hover:border-iw-blue/50 hover:shadow-[var(--shadow-md)] transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-iw-blue/10 flex items-center justify-center shrink-0 group-hover:bg-iw-blue/20 transition-colors">
            <UserPlus className="w-6 h-6 text-iw-blue" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Novo Membro</p>
            <p className="text-sm font-bold text-iw-navy mt-1">Cadastrar ficha completa</p>
            <p className="text-xs text-iw-blue mt-2 flex items-center gap-1 font-medium">
              Acessar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/membros"
          className="group bg-iw-surface rounded-[var(--radius-xl)] border border-iw-sky/20 shadow-[var(--shadow-sm)] p-6 flex items-start gap-4 hover:border-iw-sky/50 hover:shadow-[var(--shadow-md)] transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-iw-sky/10 flex items-center justify-center shrink-0 group-hover:bg-iw-sky/20 transition-colors">
            <List className="w-6 h-6 text-iw-sky" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Lista de Membros</p>
            <p className="text-sm font-bold text-iw-navy mt-1">Gerir e buscar membros</p>
            <p className="text-xs text-iw-sky mt-2 flex items-center gap-1 font-medium">
              Acessar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/ocorrencias"
          className="group bg-iw-surface rounded-[var(--radius-xl)] border border-iw-gold/20 shadow-[var(--shadow-sm)] p-6 flex items-start gap-4 hover:border-iw-gold/50 hover:shadow-[var(--shadow-md)] transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-iw-gold/10 flex items-center justify-center shrink-0 group-hover:bg-iw-gold/20 transition-colors">
            <CalendarClock className="w-6 h-6 text-iw-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-iw-muted uppercase tracking-wider">Ocorrências</p>
            <p className="text-sm font-bold text-iw-navy mt-1">Registrar no dossiê</p>
            <p className="text-xs text-iw-gold mt-2 flex items-center gap-1 font-medium">
              Acessar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </Link>
      </div>

      {/* ── Linha inferior: Aniversariantes + Últimos cadastrados ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Aniversariantes do mês */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-iw-border flex items-center gap-2">
            <Cake className="w-4 h-4 text-iw-gold" />
            <h2 className="font-bold text-iw-navy flex-1">
              Aniversariantes — {currentMonthName}
            </h2>
            <span className="text-xs text-iw-muted">
              {sortedBirthdays.length} membro{sortedBirthdays.length !== 1 ? "s" : ""}
            </span>
          </div>

          {sortedBirthdays.length === 0 ? (
            <div className="px-6 py-10 text-center text-iw-muted text-sm">
              Nenhum aniversariante este mês.
            </div>
          ) : (
            <div className="divide-y divide-iw-border max-h-72 overflow-y-auto">
              {sortedBirthdays.map((member) => {
                const role = member.ecclesiastical_roles as unknown as { name: string } | null;
                const days = daysUntilBirthday(member.birth_date);
                const isToday = days === 0;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                      isToday ? "bg-iw-gold/5" : "hover:bg-iw-bg/50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isToday
                          ? "bg-iw-gold text-white"
                          : "bg-iw-sky/15 text-iw-blue"
                      }`}
                    >
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-iw-navy truncate">
                        {member.full_name}
                        {isToday && (
                          <span className="ml-2 text-xs font-bold text-iw-gold">
                            🎂 Hoje!
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-iw-muted truncate">
                        {role?.name ?? "Sem cargo"}
                      </p>
                    </div>

                    {/* Data */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-iw-navy">
                        {formatBirthDate(member.birth_date)}
                      </p>
                      {!isToday && (
                        <p className="text-xs text-iw-muted">
                          em {days} dia{days !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos membros cadastrados */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-iw-border flex items-center justify-between">
            <h2 className="font-bold text-iw-navy">Últimos Cadastrados</h2>
            <Link
              href="/dashboard/membros"
              className="text-xs font-semibold text-iw-blue hover:text-iw-navy flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!recentMembers || recentMembers.length === 0 ? (
            <div className="px-6 py-10 text-center text-iw-muted text-sm">
              Nenhum membro cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-iw-border max-h-72 overflow-y-auto">
              {recentMembers.map((member) => {
                const role = member.ecclesiastical_roles as unknown as { name: string } | null;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-iw-bg/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-iw-blue/15 border border-iw-sky/30 flex items-center justify-center shrink-0">
                      <span className="text-iw-blue font-bold text-xs">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-iw-navy truncate">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-iw-muted truncate">
                        {role?.name ?? "Sem cargo"}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          member.status === "ACTIVE"
                            ? "bg-iw-success/10 text-iw-success"
                            : member.status === "DISCIPLINE"
                            ? "bg-iw-error/10 text-iw-error"
                            : "bg-iw-muted/10 text-iw-muted"
                        }`}
                      >
                        {member.status === "ACTIVE"
                          ? "Ativo"
                          : member.status === "DISCIPLINE"
                          ? "Disciplina"
                          : "Inativo"}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          member.financial_status === "UP_TO_DATE"
                            ? "bg-iw-success/10 text-iw-success"
                            : "bg-iw-error/10 text-iw-error"
                        }`}
                      >
                        {member.financial_status === "UP_TO_DATE"
                          ? "Em dia"
                          : "Pendente"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
