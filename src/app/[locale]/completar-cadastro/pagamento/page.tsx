import { redirect } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import Logo from "@/components/Logo";
import PagamentoInicialAlunoForm from "./PagamentoInicialAlunoForm";
import { salvarPagamentoInicialAlunoAction } from "../actions";

export const metadata = { title: "Conferência de mensalidades — CETADP" };

// ============================================================
// Última etapa do mutirão de cadastro (20/09/2026, pedido do Joaquim):
// depois da ficha completa (/completar-cadastro), antes de entrar na
// área do aluno, mostra as mensalidades do curso pra ele marcar quais
// já pagou (e como) -- ver salvarPagamentoInicialAlunoAction pra
// explicação completa da regra de negócio.
//
// Só alcança quem: (1) é aluno, (2) já completou a ficha (data_nascimento
// preenchida), (3) veio de matrícula MUTIRAO_LINK, (4) ainda não tem
// parcela gerada pra essa matrícula (idempotência -- gerarParcelas só
// roda uma vez). Qualquer outro caso pula direto pro destino normal.
// ============================================================

export default async function PagamentoInicialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: aluno } = await admin.from("ead_alunos").select("id, data_nascimento").eq("user_id", user.id).maybeSingle();

  if (!aluno) redirect(await resolverDestinoPosLogin(supabase, user.id));
  if (!aluno.data_nascimento) redirect("/completar-cadastro");

  const { data: matricula } = await admin
    .from("ead_matriculas")
    .select("id, course_id, curso_nome_snapshot, course_edition_id, data_matricula")
    .eq("aluno_id", aluno.id)
    .eq("origem", "MUTIRAO_LINK")
    .limit(1)
    .maybeSingle();

  if (!matricula) redirect(await resolverDestinoPosLogin(supabase, user.id));

  // Idempotência — já rodou esse passo antes (parcela já existe pra essa
  // matrícula), não mostra de novo.
  const { count: jaTemParcelas } = await admin
    .from("fin_contas_receber")
    .select("id", { count: "exact", head: true })
    .eq("origem_tipo", "MATRICULA_DIRETA")
    .eq("origem_id", matricula.id);

  if (jaTemParcelas && jaTemParcelas > 0) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const { data: preco } = await admin
    .from("course_pricing")
    .select("valor_matricula_centavos, valor_parcela_centavos, numero_parcelas")
    .eq("course_id", matricula.course_id)
    .maybeSingle();

  // Sem preço cadastrado pro curso — não tem o que conferir, segue o fluxo.
  if (!preco || preco.valor_parcela_centavos <= 0) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const { data: turma } = matricula.course_edition_id
    ? await admin.from("course_editions").select("data_inicio").eq("id", matricula.course_edition_id).maybeSingle()
    : { data: null };

  // Data-âncora pro cálculo de meses decorridos: início da turma > data da
  // matrícula > hoje (ver decisão do Joaquim — "Quantos meses já decorridos
  // ele já pagou").
  const hoje = new Date();
  const anchorIso = turma?.data_inicio || matricula.data_matricula || hoje.toISOString().slice(0, 10);
  const [anoIni, mesIni] = anchorIso.slice(0, 10).split("-").map(Number);
  const mesesDecorridos = (hoje.getFullYear() - anoIni) * 12 + (hoje.getMonth() - (mesIni - 1)) + 1;
  const totalParcelasSugerido = Math.min(Math.max(mesesDecorridos, 1), preco!.numero_parcelas);

  const valorMatriculaCentavos = preco!.valor_matricula_centavos;
  const valorParcelaCentavos = preco!.valor_parcela_centavos;

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-4">
          <Logo size="md" variant="dark" />
        </div>
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">CETADP</p>
          <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1 flex items-center justify-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-iw-gold" />
            Conferência de mensalidades
          </h1>
        </div>

        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-xl text-sm">
          <p>
            Antes de entrar no curso, confirme quais mensalidades você já pagou (se alguma) e a forma
            de pagamento de cada uma. As mensalidades futuras ficam pendentes normalmente — a
            secretaria vai acompanhar isso com você ao longo do curso.
          </p>
        </div>

        <PagamentoInicialAlunoForm
          action={salvarPagamentoInicialAlunoAction}
          cursoNome={matricula.curso_nome_snapshot}
          valorMatriculaCentavos={valorMatriculaCentavos}
          valorParcelaCentavos={valorParcelaCentavos}
          numeroParcelasCurso={preco!.numero_parcelas}
          totalParcelasSugerido={totalParcelasSugerido}
          primeiroVencimento={anchorIso.slice(0, 10)}
        />
      </div>
    </div>
  );
}
