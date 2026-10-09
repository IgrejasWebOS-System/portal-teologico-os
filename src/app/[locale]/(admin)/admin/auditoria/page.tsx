import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";

export const metadata = { title: "Auditoria — CETADP" };
export const dynamic = "force-dynamic";

const ROTULO_ACAO: Record<string, string> = {
  BAIXAR_PARCELA: "Baixou parcela",
  CANCELAR_PARCELA: "Cancelou parcela",
  REATIVAR_PARCELA: "Reativou parcela",
  PAGAMENTO_RETROATIVO: "Lançou pagamento retroativo",
  GERAR_PARCELAS: "Gerou parcelas",
  CRIAR_MATRICULA: "Criou matrícula",
  ATUALIZAR_MATRICULA: "Atualizou matrícula/aluno",
  CANCELAR_MATRICULA: "Cancelou matrícula",
  CONCEDER_ACESSO: "Concedeu acesso",
  AUTOATENDIMENTO_BLOQUEADO: "TENTATIVA BLOQUEADA (autoatendimento)",
};

const ROTULO_PAPEL: Record<string, string> = {
  PROFESSOR: "Professor(a)",
  SECRETARIA: "Secretaria",
  ADMIN_GLOBAL: "Admin global",
};

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

interface Linha {
  id: string;
  created_at: string;
  ator_nome: string | null;
  papel: string;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  detalhe: Record<string, unknown> | null;
}

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Somente administrador global (nível 0); leitura via service_role depois
  // dessa checagem (a tabela não tem policies — migration 135).
  const { data: papel } = await supabase
    .from("admin_roles")
    .select("level")
    .eq("user_id", user.id)
    .eq("level", 0)
    .maybeSingle();
  if (!papel) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("auditoria_acoes")
    .select("id, created_at, ator_nome, papel, acao, entidade, entidade_id, detalhe")
    .order("created_at", { ascending: false })
    .limit(300);
  const linhas = (data ?? []) as Linha[];

  return (
    <div className="min-h-screen px-8 py-8 space-y-6 bg-white text-black">
      <PageHeader
        icon={ClipboardList}
        title="Auditoria"
        description="Quem fez, em qual papel — últimas 300 ações sensíveis."
      />

      {linhas.length === 0 ? (
        <p className="text-base">Nenhuma ação registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/20">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left">
              <tr>
                <th className="p-3">Quando</th>
                <th className="p-3">Quem</th>
                <th className="p-3">Papel</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr
                  key={l.id}
                  className={`border-t border-black/10 align-top ${l.acao === "AUTOATENDIMENTO_BLOQUEADO" ? "bg-red-50" : ""}`}
                >
                  <td className="p-3 whitespace-nowrap">{fmtData(l.created_at)}</td>
                  <td className="p-3">{l.ator_nome ?? "—"}</td>
                  <td className="p-3">{ROTULO_PAPEL[l.papel] ?? l.papel}</td>
                  <td className="p-3 font-medium">{ROTULO_ACAO[l.acao] ?? l.acao}</td>
                  <td className="p-3 font-mono text-xs break-all">
                    {[l.entidade, l.entidade_id].filter(Boolean).join(" · ")}
                    {l.detalhe ? ` ${JSON.stringify(l.detalhe)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
