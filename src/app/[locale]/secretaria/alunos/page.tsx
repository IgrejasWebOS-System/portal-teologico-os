import { redirect } from "next/navigation";
import Link from "next/link";
import { BookUser, Pencil, CheckCircle2, AlertTriangle } from "lucide-react";
import ReenviarLinkButton from "@/components/ui/ReenviarLinkButton";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import { secretariaReenviarLinkAlunoAction } from "../actions";
import NucleoSelector from "../NucleoSelector";

export const metadata = { title: "Alunos — Área da Secretaria" };

// ============================================================
// /secretaria/alunos — Etapa 1 da Área da Secretaria (04/10/2026).
// Lista enxuta (nome, matrícula, núcleo, status) — sem o detalhe de
// parcelas/avaliações que /professor/alunos tem, porque lá o escopo é
// sempre um professor só; aqui pode ser dezenas de alunos espalhados
// em vários núcleos. Mesmo princípio do Dashboard: client normal
// (RLS), sem filtro manual de unidade — a RLS de ead_alunos (migration
// 062) já faz esse trabalho sozinha.
// ============================================================

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  CONCLUIDO: "Concluído",
  TRANCADO: "Trancado",
};

const STATUS_COR: Record<string, string> = {
  ATIVO: "bg-iw-success/10 text-iw-success",
  INATIVO: "bg-iw-muted/10 text-iw-muted",
  CONCLUIDO: "bg-iw-blue/10 text-iw-blue",
  TRANCADO: "bg-iw-error/10 text-iw-error",
};

export default async function AlunosSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string; msg?: string; error?: string }>;
}) {
  const { nucleo, msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  let query = supabase
    .from("ead_alunos")
    .select("id, nome_completo, matricula, status, telefone, email, church_id, churches(name)")
    .order("nome_completo");
  if (nucleo) query = query.eq("church_id", nucleo);
  const { data: alunosRaw } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunos = (alunosRaw ?? []) as any[];
  const alunoIds = alunos.map((a) => a.id);

  // "Editar" leva pra ficha de matrícula (mesma tela que /admin usa,
  // EditarMatriculaForm) — já escopada via RLS + assertAlunoNoEscopo,
  // sem precisar duplicar o formulário aqui. Pega a matrícula mais
  // relevante por aluno: EM_ANDAMENTO primeiro, senão a mais recente.
  const { data: matriculasRaw } = alunoIds.length
    ? await supabase
        .from("ead_matriculas")
        .select("id, aluno_id, status, data_matricula")
        .in("aluno_id", alunoIds)
        .order("data_matricula", { ascending: false })
    : { data: [] as { id: string; aluno_id: string; status: string; data_matricula: string }[] };
  const matriculaIdPorAluno = new Map<string, string>();
  for (const m of matriculasRaw ?? []) {
    const atual = matriculaIdPorAluno.get(m.aluno_id);
    if (!atual || m.status === "EM_ANDAMENTO") matriculaIdPorAluno.set(m.aluno_id, m.id);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <BookUser className="w-5 h-5 text-iw-gold" />
          </div>
          <h1 className="text-2xl font-black text-black">
            Alunos{" "}
            <span className="text-base font-normal text-black">
              - <span className="text-base font-black">{alunos.length}</span> aluno{alunos.length === 1 ? "" : "s"}{" "}
              nos seus núcleos.
            </span>
          </h1>
        </div>
        <NucleoSelector nucleos={nucleos} />
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {alunos.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhum aluno cadastrado nos seus núcleos ainda.</p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border bg-iw-bg/50">
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Nome</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Matrícula</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Telefone</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Status</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const matriculaId = matriculaIdPorAluno.get(a.id);
                return (
                  <tr key={a.id} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                    <td className="py-2.5 px-4 text-black font-medium">{a.nome_completo}</td>
                    <td className="py-2.5 px-4 text-black">{a.matricula ?? "—"}</td>
                    <td className="py-2.5 px-4 text-black">{a.churches?.name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-black">{a.telefone ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COR[a.status] ?? "bg-iw-muted/10 text-black"}`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {matriculaId ? (
                          <Link
                            href={`/admin/matriculas/${matriculaId}?voltarPara=/secretaria/alunos&voltarLabel=Alunos`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 shadow-sm hover:bg-black/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Link>
                        ) : (
                          <span className="text-xs text-black">—</span>
                        )}
                        <ReenviarLinkButton
                          action={secretariaReenviarLinkAlunoAction}
                          campo="aluno_id"
                          valor={a.id}
                          nome={a.nome_completo}
                          email={a.email ?? null}
                          tipo="aluno"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
