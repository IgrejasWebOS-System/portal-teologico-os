import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BookUser, Pencil, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import AreaDoAlunoPainel from "@/components/aluno/AreaDoAlunoPainel";
import { carregarAlunoPainelDataPorAlunoId } from "@/utils/aluno/painel";

export const metadata = { title: "Área do aluno — Área do Professor" };

// ============================================================
// 09/10/2026, pedido do Joaquim: o professor ver a "Área do Aluno"
// (dados, curso, financeiro, Testes/Prova, impressão) do mesmo jeito que
// o usuário CETADP vê em /dashboard/configuracoes/persona/alunos/[id].
// O [id] aqui é a MATRÍCULA (como em /professor/alunos/editar/[id]) e a
// posse é conferida antes de abrir qualquer dado: só aluno com matrícula
// vinculada a este professor.
// ============================================================

export default async function AreaDoAlunoProfessorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();
  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, aluno_id, professor_id, matricula")
    .eq("id", id)
    .maybeSingle();

  if (!matricula) notFound();
  if (matricula.professor_id !== professor.id) {
    redirect("/professor/alunos?error=" + encodeURIComponent("Esse aluno não pertence a você."));
  }

  const painel = await carregarAlunoPainelDataPorAlunoId(admin, matricula.aluno_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <BookUser className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black">{painel?.aluno.nomeCompleto ?? "Aluno"}</h1>
            <p className="text-sm text-black">Matrícula {matricula.matricula} — área do aluno</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/professor/alunos/editar/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 hover:bg-black/10 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Editar cadastro completo
          </Link>
          <Link
            href="/professor/alunos"
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
            alunoId={matricula.aluno_id}
          />
        </div>
      )}
    </div>
  );
}
