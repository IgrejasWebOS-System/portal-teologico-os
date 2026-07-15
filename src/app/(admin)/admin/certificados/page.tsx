import { redirect } from "next/navigation";
import { Award, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { marcarComoConcluidoAction, emitirCertificadoAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

// ============================================================
// /admin/certificados — fecha o ciclo inscrição → matrícula →
// conclusão → certificado. Usa o cliente admin (service_role) para
// as leituras porque `profiles` só tem policy de SELECT da própria
// linha (ver migração 015) — sem isso, o nome de alunos que não são
// o próprio funcionário logado não apareceria.
// ============================================================
export default async function CertificadosAdminPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const admin = createAdminClient();

  const { data: emAndamento } = await admin
    .from("enrollments")
    .select("id, user_id, course_id, enrolled_at, courses(title)")
    .eq("status", "ENROLLED")
    .order("enrolled_at", { ascending: false });

  const { data: concluidasSemCertificado } = await admin
    .from("enrollments")
    .select("id, user_id, course_id, completed_at, courses(title)")
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false });

  const { data: certificadosEmitidos } = await admin
    .from("certificates")
    .select("id, numero_certificado, nome_aluno, nome_curso, emitido_em")
    .order("emitido_em", { ascending: false });

  const idsComCertificado = new Set(
    (await admin.from("certificates").select("enrollment_id")).data?.map((c) => c.enrollment_id) ?? []
  );

  const pendentesDeCertificado = (concluidasSemCertificado ?? []).filter(
    (e) => !idsComCertificado.has(e.id)
  );

  // Buscar nomes dos alunos (profiles) para as duas listas de matrícula
  const userIds = [
    ...new Set([...(emAndamento ?? []), ...pendentesDeCertificado].map((e) => e.user_id)),
  ];
  const { data: perfis } =
    userIds.length > 0
      ? await admin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] };
  const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-iw-gold" />
        </div>
        <div>
          <h1 className="text-xl font-black text-iw-navy tracking-tight">Certificados</h1>
          <p className="text-iw-muted text-xs mt-0.5">
            Marque matrículas como concluídas e emita o certificado — o número
            gerado já pode ser validado publicamente em /certificados.
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

      {/* Pendentes de certificado */}
      <section>
        <h2 className="font-extrabold text-sm text-iw-navy uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-iw-gold" />
          Concluídas — pendentes de certificado ({pendentesDeCertificado.length})
        </h2>
        {pendentesDeCertificado.length === 0 ? (
          <p className="text-iw-muted text-sm">Nenhuma matrícula concluída aguardando certificado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendentesDeCertificado.map((e) => {
              const perfil = perfilPorId.get(e.user_id);
              const curso = (e as unknown as { courses: { title: string } | null }).courses;
              return (
                <div
                  key={e.id}
                  className="bg-iw-surface border border-iw-border rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-iw-navy text-sm">
                      {perfil?.full_name || perfil?.email || "Aluno"}
                    </p>
                    <p className="text-xs text-iw-muted">{curso?.title ?? "Curso"}</p>
                  </div>
                  <form action={emitirCertificadoAction}>
                    <input type="hidden" name="enrollment_id" value={e.id} />
                    <button
                      type="submit"
                      className="bg-iw-gold text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Emitir certificado
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Em andamento */}
      <section>
        <h2 className="font-extrabold text-sm text-iw-navy uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-iw-muted" />
          Em andamento ({(emAndamento ?? []).length})
        </h2>
        {(emAndamento ?? []).length === 0 ? (
          <p className="text-iw-muted text-sm">Nenhuma matrícula em andamento.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {(emAndamento ?? []).map((e) => {
              const perfil = perfilPorId.get(e.user_id);
              const curso = (e as unknown as { courses: { title: string } | null }).courses;
              return (
                <div
                  key={e.id}
                  className="bg-iw-bg border border-iw-border rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-iw-navy text-sm">
                      {perfil?.full_name || perfil?.email || "Aluno"}
                    </p>
                    <p className="text-xs text-iw-muted">{curso?.title ?? "Curso"}</p>
                  </div>
                  <form action={marcarComoConcluidoAction}>
                    <input type="hidden" name="enrollment_id" value={e.id} />
                    <button
                      type="submit"
                      className="bg-iw-bg text-iw-muted text-xs font-bold px-4 py-2 rounded-lg border border-iw-border hover:border-iw-success hover:text-iw-success transition-colors"
                    >
                      Marcar como concluída
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Emitidos */}
      <section>
        <h2 className="font-extrabold text-sm text-iw-navy uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-iw-success" />
          Certificados emitidos ({(certificadosEmitidos ?? []).length})
        </h2>
        {(certificadosEmitidos ?? []).length === 0 ? (
          <p className="text-iw-muted text-sm">Nenhum certificado emitido ainda.</p>
        ) : (
          <div className="bg-iw-surface border border-iw-border rounded-2xl overflow-hidden">
            <ul className="divide-y divide-iw-border">
              {(certificadosEmitidos ?? []).map((c) => (
                <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-iw-navy text-sm">{c.nome_aluno}</p>
                    <p className="text-xs text-iw-muted">{c.nome_curso}</p>
                  </div>
                  <span className="text-xs font-mono text-iw-gold font-bold">{c.numero_certificado}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
