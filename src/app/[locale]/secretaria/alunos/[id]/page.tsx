import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BookUser, Pencil, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario } from "@/utils/secretaria";
import AreaDoAlunoPainel from "@/components/aluno/AreaDoAlunoPainel";
import { carregarAlunoPainelDataPorAlunoId } from "@/utils/aluno/painel";

export const metadata = { title: "Área do aluno — Área da Secretaria" };

// ============================================================
// 09/10/2026, pedido do Joaquim: a secretaria do setor ver a "Área do
// Aluno" (dados, curso, financeiro, Testes/Prova, impressão) igual ao
// usuário CETADP em /dashboard/configuracoes/persona/alunos/[id].
// Escopo: a consulta de ead_alunos usa o client normal (RLS, migration
// 062) — aluno fora dos núcleos do secretário volta vazio e dá 404.
// ============================================================

export default async function AreaDoAlunoSecretariaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const { data: aluno } = await supabase
    .from("ead_alunos")
    .select("id, nome_completo, matricula")
    .eq("id", id)
    .maybeSingle();
  if (!aluno) notFound();

  const { data: matriculas } = await supabase
    .from("ead_matriculas")
    .select("id, status, data_matricula")
    .eq("aluno_id", id)
    .order("data_matricula", { ascending: false });
  const matriculaPrincipal =
    (matriculas ?? []).find((m) => m.status === "EM_ANDAMENTO") ?? (matriculas ?? [])[0] ?? null;

  const painel = await carregarAlunoPainelDataPorAlunoId(supabase, id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <BookUser className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black">{aluno.nome_completo}</h1>
            <p className="text-sm text-black">Matrícula {aluno.matricula} — área do aluno</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {matriculaPrincipal && (
            <Link
              href={`/admin/matriculas/${matriculaPrincipal.id}?voltarPara=/secretaria/alunos/${id}&voltarLabel=Área do aluno`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 hover:bg-black/10 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Editar cadastro completo
            </Link>
          )}
          <Link
            href="/secretaria/alunos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 hover:bg-black/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </div>

      {!painel ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold px-5 py-14 text-center">
          <p className="text-black text-sm font-medium">Não foi possível carregar a área deste aluno.</p>
        </div>
      ) : (
        <div className="bg-iw-navy rounded-2xl p-4 shadow-sm">
          <AreaDoAlunoPainel
            aluno={painel.aluno}
            matriculas={painel.matriculas}
            parcelas={painel.parcelas}
            avaliacoes={painel.avaliacoes}
            expandido
            modoStaff
            alunoId={id}
          />
        </div>
      )}
    </div>
  );
}
