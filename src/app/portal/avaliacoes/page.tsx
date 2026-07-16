import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, GraduationCap, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { iniciarAvaliacaoAction } from "./actions";

export const metadata = { title: "Simulados e Provas — Portal do Aluno" };

interface PageProps {
  searchParams: Promise<{ msg?: string; error?: string }>;
}

const STATUS_MATRICULA_LABEL: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  CANCELADO: "Cancelado",
};

export default async function AvaliacoesPage({ searchParams }: PageProps) {
  const { msg, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!aluno) {
    return (
      <div className="min-h-screen bg-iw-bg flex items-center justify-center px-8">
        <div className="max-w-md bg-iw-surface border border-iw-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <p className="text-iw-muted text-sm">
            Você ainda não tem uma matrícula ativa como aluno do CETADP.
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-iw-gold font-semibold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Portal
          </Link>
        </div>
      </div>
    );
  }

  const { data: matriculas } = await supabase
    .from("ead_matriculas")
    .select("id, curso_nome_snapshot, course_id, status, nota_final")
    .eq("aluno_id", aluno.id)
    .order("data_matricula", { ascending: false });

  const matriculaIds = (matriculas ?? []).map((m) => m.id);

  const { data: avaliacoes } = matriculaIds.length
    ? await supabase
        .from("avaliacoes")
        .select("id, matricula_id, tipo, status, nota, aprovado, iniciada_em, finalizada_em")
        .in("matricula_id", matriculaIds)
        .order("iniciada_em", { ascending: false })
    : { data: [] };

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Portal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Simulados e Provas</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              O simulado é opcional e pode ser refeito quantas vezes quiser. A prova só pode ser feita uma vez.
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

        {(!matriculas || matriculas.length === 0) ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm">Você ainda não tem nenhuma matrícula.</p>
          </div>
        ) : (
          matriculas.map((m) => {
            const avaliacoesDaMatricula = (avaliacoes ?? []).filter((a) => a.matricula_id === m.id);
            const provaExistente = avaliacoesDaMatricula.find((a) => a.tipo === "PROVA");
            const podeAvaliar = m.status === "EM_ANDAMENTO" && !!m.course_id;

            return (
              <div key={m.id} className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-iw-blue" />
                    <p className="font-bold text-iw-navy">{m.curso_nome_snapshot}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-iw-bg border border-iw-border text-iw-muted">
                    {STATUS_MATRICULA_LABEL[m.status] ?? m.status}
                    {m.nota_final != null ? ` · nota ${Number(m.nota_final).toFixed(1)}` : ""}
                  </span>
                </div>

                {!m.course_id && (
                  <p className="text-xs text-iw-muted italic">
                    Este curso ainda não tem avaliações configuradas.
                  </p>
                )}

                {podeAvaliar && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Simulado */}
                    <form action={iniciarAvaliacaoAction} className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                      <input type="hidden" name="matricula_id" value={m.id} />
                      <input type="hidden" name="tipo" value="SIMULADO" />
                      <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Simulado (opcional)</p>
                      <label className="block text-[11px] text-iw-muted">
                        Quantidade de questões
                        <select name="num_questoes" defaultValue="10" className="mt-1 w-full bg-white border border-iw-border rounded-lg px-2.5 py-2 text-sm cursor-pointer">
                          <option value="10">10</option>
                          <option value="15">15</option>
                          <option value="20">20</option>
                        </select>
                      </label>
                      <button type="submit" className="w-full bg-iw-blue hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity">
                        Fazer simulado
                      </button>
                    </form>

                    {/* Prova */}
                    <div className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-iw-navy uppercase tracking-wider">Prova (única tentativa)</p>
                      {provaExistente ? (
                        <Link
                          href={`/portal/avaliacoes/${provaExistente.id}`}
                          className="block text-center text-xs font-semibold text-iw-blue hover:underline"
                        >
                          Ver resultado da prova ({provaExistente.status === "FINALIZADA" ? `nota ${Number(provaExistente.nota).toFixed(1)}` : "em andamento"})
                        </Link>
                      ) : (
                        <form action={iniciarAvaliacaoAction} className="space-y-2">
                          <input type="hidden" name="matricula_id" value={m.id} />
                          <input type="hidden" name="tipo" value="PROVA" />
                          <label className="flex items-start gap-2 text-[11px] text-iw-muted leading-snug">
                            <input type="checkbox" name="confirmo_prova" className="mt-0.5" required />
                            <span className="inline-flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 text-iw-warning shrink-0 mt-0.5" />
                              Estou ciente de que, a partir do início, não poderei desistir e só terei esta tentativa.
                            </span>
                          </label>
                          <button type="submit" className="w-full bg-iw-gold hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-opacity">
                            Iniciar prova
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {avaliacoesDaMatricula.filter((a) => a.tipo === "SIMULADO").length > 0 && (
                  <div className="pt-2 border-t border-iw-border">
                    <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Histórico de simulados</p>
                    <ul className="space-y-1">
                      {avaliacoesDaMatricula
                        .filter((a) => a.tipo === "SIMULADO")
                        .map((a) => (
                          <li key={a.id} className="text-xs text-iw-muted flex items-center justify-between">
                            <Link href={`/portal/avaliacoes/${a.id}`} className="hover:text-iw-navy hover:underline">
                              {new Date(a.iniciada_em).toLocaleDateString("pt-BR")} — {a.status === "FINALIZADA" ? `nota ${Number(a.nota).toFixed(1)}` : "em andamento"}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
