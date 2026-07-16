import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import LojaCatalogo from "./LojaCatalogo";

export const metadata = {
  title: "Loja",
};

interface Produto {
  id: string;
  tipo: "CURSO_AVULSO" | "MATERIAL_FISICO" | "PDF_DOWNLOAD" | "PDF_VIRTUAL";
  titulo: string;
  descricao: string | null;
  preco_centavos: number;
  imagem_url: string | null;
}

// ============================================================
// /loja — catálogo público de cursos avulsos, material físico e
// PDFs (download/virtual), aberto para qualquer visitante — membro
// do ministério ou não. Adicionar ao carrinho não exige login;
// login só é exigido no checkout (finalizarCompraAction) e no
// acesso a PDFs gratuitos (/api/biblioteca).
// ============================================================
export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from("products")
    .select("id, tipo, titulo, descricao, preco_centavos, imagem_url")
    .eq("status", "ATIVO")
    .order("tipo")
    .order("titulo");

  const porTipo = (produtos ?? []).reduce<Record<string, Produto[]>>((acc, p) => {
    (acc[p.tipo] ??= []).push(p as Produto);
    return acc;
  }, {});

  return (
    <div className="w-full min-h-screen bg-iw-surface text-iw-navy flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="bg-iw-bg">
          <div className="max-w-5xl mx-auto px-6 pt-6 pb-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-7 h-7 text-iw-gold" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Loja CETADP
              </h1>
              <Link
                href="/loja/carrinho"
                className="text-iw-gold font-semibold text-lg hover:underline"
              >
                Ver meu carrinho →
              </Link>
            </div>
            <p className="text-iw-muted text-base max-w-2xl text-center">
              Cursos avulsos, material da biblioteca e PDFs — aberto para
              membros do ministério e para o público em geral. Não precisa
              ser aluno matriculado para comprar.
            </p>
          </div>
        </section>

        {error && (
          <div className="max-w-5xl mx-auto px-6 pt-8">
            <div className="p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          </div>
        )}

        {produtos && produtos.length > 0 && <LojaCatalogo porTipo={porTipo} />}

        {(!produtos || produtos.length === 0) && (
          <section className="max-w-3xl mx-auto px-6 py-20 text-center">
            <p className="text-iw-muted text-sm">
              Nenhum produto disponível no momento. Volte em breve.
            </p>
          </section>
        )}
      </main>

      <PublicFooter minimal />
    </div>
  );
}
