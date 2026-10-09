import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, XOctagon, DatabaseBackup } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import { executarVerificacoes, type Severidade } from "@/utils/monitor/verificacoes";

export const metadata = { title: "Saúde do sistema — CETADP" };
export const dynamic = "force-dynamic";

const COR: Record<Severidade, string> = {
  OK: "border-l-green-600 bg-green-50",
  INFO: "border-l-blue-500 bg-blue-50",
  AVISO: "border-l-amber-500 bg-amber-50",
  CRITICO: "border-l-red-600 bg-red-50",
};

function Icone({ s }: { s: Severidade }) {
  if (s === "OK") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (s === "CRITICO") return <XOctagon className="h-5 w-5 text-red-600" />;
  return <AlertTriangle className="h-5 w-5 text-amber-600" />;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtMb(bytes: number | null) {
  if (bytes == null) return "—";
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export default async function SaudeSistemaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Somente administrador global (nível 0). Leitura com a sessão do próprio
  // usuário; os dados do monitor vêm via service_role depois dessa checagem.
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

  const resultado = await executarVerificacoes();
  const admin = createAdminClient();
  const { data: historico } = await admin
    .from("monitor_alertas")
    .select("id, severidade, titulo, primeiro_em, ultimo_em, resolvido_em, ocorrencias")
    .order("ultimo_em", { ascending: false })
    .limit(15);

  const problemas = resultado.verificacoes.filter((v) => v.severidade !== "OK");
  const geral: Severidade = problemas.some((p) => p.severidade === "CRITICO")
    ? "CRITICO"
    : problemas.length > 0
      ? "AVISO"
      : "OK";

  return (
    <div className="min-h-screen px-8 py-8 space-y-8">
      <PageHeader
        icon={Activity}
        title="Saúde do sistema"
        description={`Ambiente: ${resultado.ambiente} · verificado em ${fmtData(resultado.geradoEm)}`}
      />

      <div className={`rounded-lg border-l-4 p-4 flex items-center gap-3 ${COR[geral]}`}>
        <Icone s={geral} />
        <p className="font-semibold">
          {geral === "OK"
            ? "Tudo certo: nenhuma anomalia encontrada."
            : `${problemas.length} ponto(s) de atenção encontrado(s).`}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Verificações</h2>
        {resultado.verificacoes.map((v) => (
          <div key={v.codigo} className={`rounded-lg border-l-4 p-4 ${COR[v.severidade]}`}>
            <div className="flex items-center gap-2">
              <Icone s={v.severidade} />
              <span className="font-semibold">{v.titulo}</span>
              <span className="text-xs uppercase tracking-wide opacity-70">{v.severidade}</span>
            </div>
            <p className="mt-1 text-sm">{v.resumo}</p>
            {v.causa && (
              <p className="mt-2 text-sm">
                <b>Causa técnica provável:</b> {v.causa}
              </p>
            )}
            {v.procedimento && (
              <p className="mt-2 text-sm">
                <b>Procedimento a adotar:</b> {v.procedimento}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DatabaseBackup className="h-5 w-5" /> Backups registrados
        </h2>
        <p className="text-base text-center uppercase opacity-80">
          Padrão atual: o plano do Supabase deste projeto é <b>Free</b> e não faz backup automático. O backup é o
          dump manual gerado pelo <code className="normal-case">scripts/backup-manager-v2.ps1</code> (validado com
          pg_restore --list e copiado criptografado para o OneDrive), que registra cada execução aqui.
          Recomendado: rodar diariamente e sempre antes de migrations (
          <code className="normal-case">-PreMigration -Label ...</code>).
        </p>
        {resultado.backups.length === 0 ? (
          <p className="text-sm">Nenhum backup registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Quando</th>
                  <th className="py-2 pr-4">Rótulo</th>
                  <th className="py-2 pr-4">Arquivo</th>
                  <th className="py-2 pr-4">Tamanho</th>
                  <th className="py-2 pr-4">Itens validados</th>
                </tr>
              </thead>
              <tbody>
                {resultado.backups.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 pr-4">{fmtData(b.registrado_em)}</td>
                    <td className="py-2 pr-4">{b.rotulo ?? "—"}</td>
                    <td className="py-2 pr-4 break-all">{b.arquivo ?? "—"}</td>
                    <td className="py-2 pr-4">{fmtMb(b.tamanho_bytes)}</td>
                    <td className="py-2 pr-4">{b.entradas ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico de alertas</h2>
        {!historico || historico.length === 0 ? (
          <p className="text-sm">Nenhum alerta registrado.</p>
        ) : (
          <ul className="space-y-2 text-base text-center uppercase">
            {historico.map((a) => (
              <li key={a.id}>
                [{a.severidade}] {a.titulo} — desde {fmtData(a.primeiro_em)}
                {a.resolvido_em ? ` · resolvido em ${fmtData(a.resolvido_em)}` : " · ABERTO"}
                {a.ocorrencias > 1 ? ` · ${a.ocorrencias} verificações` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="text-base text-center uppercase opacity-70">
          A verificação automática roda 1x por dia (Vercel Cron) e avisa por e-mail os administradores globais.
        </p>
      </section>
    </div>
  );
}
