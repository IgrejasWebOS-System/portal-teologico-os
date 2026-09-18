import Link from "next/link";
import { notFound } from "next/navigation";
import { BookUser, Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import AreaDoAlunoPainel from "@/components/aluno/AreaDoAlunoPainel";
import { carregarAlunoPainelDataPorAlunoId } from "@/utils/aluno/painel";

// ============================================================
// Cadastro de Alunos > acessar aluno — gerenciamento pela secretaria
// (15/09/2026). Réplica staff da "Minha Área" do próprio aluno (mesma
// AreaDoAlunoPainel, em modoStaff — sem troca de senha/sign-out, que
// agem sobre a sessão de quem está logado). Acesso já é "só senha
// master staff" porque TODO o /dashboard/* (inclusive configuracoes)
// já é gated por checkIsStaff em (igreja)/layout.tsx — nenhuma checagem
// extra precisa ser feita aqui.
// Edição da ficha completa (dados pessoais + curso/vínculo + pagamento)
// continua no formulário rico já existente em /admin/matriculas/[id]
// (EditarMatriculaForm) — não duplicado aqui, só linkado.
// ============================================================

const STATUS_STYLE: Record<string, string> = {
  ATIVO: "bg-iw-success-bg text-iw-success",
  INATIVO: "bg-iw-bg text-iw-muted",
  TRANCADO: "bg-iw-warning-bg text-iw-warning",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlunoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: aluno }, { data: matriculas }] = await Promise.all([
    supabase
      .from("ead_alunos")
      .select("id, nome_completo, matricula, status, curso_pretendido, campo_ministerio_nome")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ead_matriculas")
      .select("id, status, data_matricula")
      .eq("aluno_id", id)
      .order("data_matricula", { ascending: false }),
  ]);

  if (!aluno) notFound();

  const listaMatriculas = matriculas ?? [];
  const matriculaPrincipal = listaMatriculas.find((m) => m.status === "EM_ANDAMENTO") ?? listaMatriculas[0] ?? null;

  const painel = await carregarAlunoPainelDataPorAlunoId(supabase, id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={BookUser}
        title={aluno.nome_completo}
        description={`Matrícula ${aluno.matricula} — gerenciamento pela secretaria`}
        backHref="/dashboard/configuracoes/persona/alunos"
        backLabel="Voltar para Alunos"
        actions={
          matriculaPrincipal ? (
            <Link
              href={`/admin/matriculas/${matriculaPrincipal.id}?voltarPara=${encodeURIComponent(
                `/dashboard/configuracoes/persona/alunos/${id}`
              )}&voltarLabel=${encodeURIComponent(`Voltar para ${aluno.nome_completo}`)}`}
              className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
            >
              <Pencil className="w-4 h-4" />
              Editar cadastro completo
            </Link>
          ) : undefined
        }
      />

      <div className="bg-iw-surface rounded-2xl border border-iw-gold p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <span className="block text-[10px] font-bold text-iw-muted uppercase tracking-wider">Curso pretendido</span>
          <span className="text-sm font-semibold text-iw-navy">{aluno.curso_pretendido ?? "—"}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-iw-muted uppercase tracking-wider">Campo / Ministério</span>
          <span className="text-sm font-semibold text-iw-navy">{aluno.campo_ministerio_nome ?? "—"}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-iw-muted uppercase tracking-wider">Status</span>
          <span className={`inline-block text-[11px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_STYLE[aluno.status] ?? "bg-iw-bg text-iw-muted"}`}>
            {aluno.status}
          </span>
        </div>
      </div>

      {!painel ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold px-5 py-14 text-center">
          <BookUser className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-iw-muted text-sm font-medium">Não foi possível carregar a área de gerenciamento deste aluno.</p>
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
