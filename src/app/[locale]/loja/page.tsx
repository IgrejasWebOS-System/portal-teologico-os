import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import LojaCatalogo from "./LojaCatalogo";

export async function generateMetadata() {
  const t = await getTranslations("loja");
  return { title: t("metaTitulo") };
}

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
  const t = await getTranslations("loja");
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
    <div className="w-full min-h-screen bg-iw-surface text-iw-navy flex flex-col iw-scope-preto">
      <PublicHeader />

      <main className="flex-1">
        <section className="bg-iw-bg">
          <div className="max-w-5xl mx-auto px-6 pt-6 pb-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-black border-2 border-[#E88D0C] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-7 h-7 text-[#E88D0C]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {t("titulo")}
              </h1>
              <Link
                href="/loja/carrinho"
                className="text-iw-gold font-semibold text-lg hover:underline"
              >
                {t("verCarrinho")}
              </Link>
            </div>
            <p className="text-iw-muted text-base max-w-2xl text-center">
              {t("subtitulo")}
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
              {t("semProdutos")}
            </p>
          </section>
        )}
      </main>

      <PublicFooter minimal />
    </div>
  );
}
