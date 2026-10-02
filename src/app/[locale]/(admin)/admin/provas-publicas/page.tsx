import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { ShieldAlert, FileCheck2, Link2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { checkIsStaff } from "@/utils/staff";

// ============================================================
// Secretaria: respostas das provas públicas por link + CPF (01/10/2026,
// pedido do Joaquim). provas_publicas_respostas não tem policy de RLS
// para "authenticated" (só service_role) -- por isso esta página lê com
// o client admin, depois de confirmar com o client normal que quem está
// logado é staff (mesmo padrão de /admin/inscricoes).
// ============================================================

export default async function ProvasPublicasAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await checkIsStaff(supabase, user.id))) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-iw-surface border border-iw-error/30 rounded-2xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-iw-error mx-auto mb-3" />
        <h1 className="text-lg font-bold text-iw-navy mb-1">Acesso restrito</h1>
        <p className="text-iw-muted text-sm">Esta área é exclusiva da secretaria do CETADP.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  const [{ data: provas }, { data: respostas }] = await Promise.all([
    admin.from("provas_publicas").select("id, materia, titulo, slug, ativo").order("numero_teste"),
    admin
      .from("provas_publicas_respostas")
      .select("id, prova_id, cpf, nome_completo, acertos, total, nota, aprovado, enviado_em, ead_aluno_id, vinculado_em")
      .order("enviado_em", { ascending: false }),
  ]);

  type Resposta = NonNullable<typeof respostas>[number];
  const respostasPorProva = new Map<string, Resposta[]>();
  for (const r of respostas ?? []) {
    const lista = respostasPorProva.get(r.prova_id) ?? [];
    lista.push(r);
    respostasPorProva.set(r.prova_id, lista);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={FileCheck2}
        title="Provas públicas (link + CPF)"
        description="Respostas enviadas pelos links públicos, com o status de vínculo ao cadastro do aluno."
        backHref="/admin"
        backLabel="Voltar para o Painel"
      />

      {(provas ?? []).map((prova) => {
        const lista = respostasPorProva.get(prova.id) ?? [];
        return (
          <div key={prova.id} className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 bg-iw-bg border-b border-iw-border">
              <div>
                <p className="text-sm font-bold text-iw-navy">{prova.titulo}</p>
                <p className="text-xs text-iw-muted">{prova.materia}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-iw-muted">
                <Link2 className="w-3 h-3" /> /prova-publica/{prova.slug}
              </span>
            </div>

            {lista.length === 0 ? (
              <div className="px-5 py-6 text-center text-iw-muted text-sm">Nenhuma resposta enviada ainda.</div>
            ) : (
              <ul className="divide-y divide-iw-border">
                {lista.map((r) => (
                  <li key={r.id} className="grid grid-cols-[1.2fr_0.65fr_0.75fr_0.55fr_0.6fr_0.65fr] items-center px-5 py-3 gap-3">
                    <span className="text-sm font-semibold text-iw-navy truncate">{r.nome_completo}</span>
                    <span className="text-xs text-iw-muted">CPF {r.cpf}</span>
                    <span className="text-xs text-iw-muted">
                      {new Date(r.enviado_em).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-xs text-iw-muted">
                      {r.acertos}/{r.total} · nota {Number(r.nota).toFixed(1)}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-center ${
                        r.aprovado ? "bg-iw-success-bg text-iw-success" : "bg-iw-error-bg text-iw-error"
                      }`}
                    >
                      {r.aprovado ? "Aprovado" : "Reprovado"}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-center ${
                        r.ead_aluno_id ? "bg-iw-success-bg text-iw-success" : "bg-iw-warning-bg text-iw-warning"
                      }`}
                    >
                      {r.ead_aluno_id ? "Vinculado" : "Pendente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
