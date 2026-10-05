import { createAdminClient } from "@/utils/supabase/admin";
import Logo from "@/components/Logo";
import ProvaPublicaForm from "./ProvaPublicaForm";

export const metadata = { title: "Prova — CETADP" };

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ============================================================
// Rota pública (sem login) — prova "sempre a mesma" por link + CPF
// (01/10/2026, pedido do Joaquim). Caso específico pra aluno que ainda
// não tem matrícula: o fluxo normal de teste logado no portal continua
// existindo normalmente, em paralelo.
// ============================================================

export default async function ProvaPublicaPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: prova } = await admin
    .from("provas_publicas")
    .select("id, materia, titulo, ativo")
    .eq("slug", slug)
    .maybeSingle();

  if (!prova) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-iw-navy">Link inválido — confira com quem te enviou.</p>
      </div>
    );
  }

  if (!prova.ativo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-iw-navy font-bold">Esta prova não está mais disponível</p>
          <p className="text-sm text-black">Fale com a secretaria do CETADP pra saber como proceder.</p>
        </div>
      </div>
    );
  }

  const { data: questoes } = await admin
    .from("provas_publicas_questoes")
    .select("ordem, formato, enunciado, opcoes")
    .eq("prova_id", prova.id)
    .order("ordem");

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 text-center">
          <Logo size="lg" />
          <div className="flex flex-col items-center justify-center py-2">
            <p className="text-xs sm:text-base font-bold uppercase tracking-wide text-iw-navy text-center">
              CETADP — Centro Educacional Teológico das Assembleias de Deus Piracicaba
            </p>
            <p className="flex items-baseline gap-2 flex-wrap justify-center mt-1">
              <span className="text-[30px] font-black tracking-tight leading-none text-iw-gold whitespace-nowrap">
                {prova.materia} -
              </span>
              <span className="text-[30px] font-black text-black tracking-tight leading-none">{prova.titulo}</span>
            </p>
          </div>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
          <ProvaPublicaForm slug={slug} questoes={questoes ?? []} />
        </div>
      </div>
    </div>
  );
}
