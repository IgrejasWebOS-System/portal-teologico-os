import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UserPlus, ShieldAlert, Mail, Phone, IdCard } from "lucide-react";
import { approveInscricaoAction, rejectInscricaoAction } from "./actions";

const STAFF_ROLES = ["GLOBAL_ADMIN", "SECTOR_ADMIN", "LOCAL_ADMIN"];

const CURSO_LABEL: Record<string, string> = {
  OFICIAL: "Curso Oficial",
  RECICLAGEM: "Curso de Reciclagem",
  TEOLOGIA_BASICO: "Teologia — Básico",
  TEOLOGIA_MEDIO: "Teologia — Médio",
  TEOLOGIA_AVANCADO: "Teologia — Avançado",
  TREINAMENTO: "Treinamento / Capacitação",
};

const STATUS_STYLE: Record<string, string> = {
  PENDENTE: "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  APROVADA: "bg-iw-success-bg text-iw-success border-iw-success/30",
  REJEITADA: "bg-iw-error-bg text-iw-error border-iw-error/30",
};

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

export default async function InscricoesAdminPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  const isStaff = !!profile && STAFF_ROLES.includes(profile.system_role ?? "");

  if (!isStaff) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-iw-surface border border-iw-error/30 rounded-2xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-iw-error mx-auto mb-3" />
        <h1 className="text-lg font-bold text-iw-navy mb-1">Acesso restrito</h1>
        <p className="text-iw-muted text-sm">
          Esta área é exclusiva da secretaria do CETADP. Fale com um
          administrador do sistema se você acredita que deveria ter acesso.
        </p>
      </div>
    );
  }

  const { data: inscricoes } = await supabase
    .from("ead_inscricoes")
    .select("*, ead_campos_ministerios(nome)")
    .order("created_at", { ascending: false });

  // Pendentes primeiro (são as que exigem ação), depois as já analisadas
  const STATUS_ORDER: Record<string, number> = { PENDENTE: 0, APROVADA: 1, REJEITADA: 2 };
  const lista = [...(inscricoes ?? [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">
            Inscrições do Portal EAD
          </h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Aprove ou rejeite candidatos ao CETADP. Ao aprovar, a matrícula é
            gerada e o acesso é enviado por e-mail.
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

      {lista.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhuma inscrição recebida ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((i) => (
            <div
              key={i.id}
              className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-iw-navy">{i.nome_completo}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-iw-muted">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{i.email}</span>
                    {i.telefone && (
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{i.telefone}</span>
                    )}
                    {i.cpf && (
                      <span className="inline-flex items-center gap-1"><IdCard className="w-3 h-3" />{i.cpf}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[i.status] ?? STATUS_STYLE.PENDENTE}`}
                >
                  {i.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-iw-muted">
                <span><strong className="text-iw-navy">Curso:</strong> {CURSO_LABEL[i.curso_pretendido] ?? i.curso_pretendido}</span>
                <span><strong className="text-iw-navy">Campo/Ministério:</strong> {i.ead_campos_ministerios?.nome ?? i.campo_ministerio_nome ?? "—"}</span>
                {i.matricula_gerada && (
                  <span><strong className="text-iw-navy">Matrícula:</strong> {i.matricula_gerada}</span>
                )}
              </div>

              {i.mensagem && (
                <p className="text-xs text-iw-muted italic border-l-2 border-iw-border pl-3">
                  &ldquo;{i.mensagem}&rdquo;
                </p>
              )}

              {i.status === "PENDENTE" && (
                <div className="flex items-center gap-3 pt-2 border-t border-iw-border mt-1">
                  <form action={approveInscricaoAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      type="submit"
                      className="bg-iw-success text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Aprovar e gerar matrícula
                    </button>
                  </form>
                  <form action={rejectInscricaoAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      type="submit"
                      className="bg-iw-bg text-iw-muted text-xs font-bold px-4 py-2 rounded-lg border border-iw-border hover:border-iw-error hover:text-iw-error transition-colors"
                    >
                      Rejeitar
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
