import Link from "next/link";
import { GraduationCap, Package, FileDown, BookOpenCheck, ShoppingBag } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import AdicionarAoCarrinhoBotao from "./AdicionarAoCarrinhoBotao";

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

const SECOES: Record<Produto["tipo"], { titulo: string; icon: typeof GraduationCap }> = {
  CURSO_AVULSO: { titulo: "Cursos Avulsos", icon: GraduationCap },
  MATERIAL_FISICO: { titulo: "Material Físico", icon: Package },
  PDF_DOWNLOAD: { titulo: "PDFs para Baixar", icon: FileDown },
  PDF_VIRTUAL: { titulo: "Leitura no Portal", icon: BookOpenCheck },
};

function formatarPreco(centavos: number) {
  if (centavos === 0) return "Grátis";
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
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
    <div className="w-full bg-iw-surface text-iw-navy">
      <PublicHeader />

      <main>
        <section className="bg-iw-bg">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-iw-gold" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Loja CETADP
            </h1>
            <p className="text-iw-muted text-base max-w-2xl">
              Cursos avulsos, material da biblioteca e PDFs — aberto para
              membros do ministério e para o público em geral. Não precisa
              ser aluno matriculado para comprar.
            </p>
            <Link
              href="/loja/carrinho"
              className="text-iw-gold font-semibold text-sm hover:underline"
            >
              Ver meu carrinho →
            </Link>
          </div>
        </section>

        {error && (
          <div className="max-w-5xl mx-auto px-6 pt-8">
            <div className="p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
              {decodeURIComponent(error)}
            </div>
          </div>
        )}

        {(Object.keys(SECOES) as Produto["tipo"][]).map((tipo) => {
          const itensSecao = porTipo[tipo];
          if (!itensSecao || itensSecao.length === 0) return null;
          const { titulo, icon: Icon } = SECOES[tipo];

          return (
            <section key={tipo} className="max-w-5xl mx-auto px-6 py-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-iw-gold" />
                </div>
                <h2 className="text-xl font-black tracking-tight">{titulo}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {itensSecao.map((produto) => {
                  const gratuito = produto.preco_centavos === 0;
                  const ehPdf = produto.tipo === "PDF_DOWNLOAD" || produto.tipo === "PDF_VIRTUAL";

                  return (
                    <div
                      key={produto.id}
                      className="bg-iw-bg border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-3"
                    >
                      <h3 className="font-extrabold text-base text-iw-navy leading-tight">
                        {produto.titulo}
                      </h3>
                      {produto.descricao && (
                        <p className="text-iw-muted text-sm leading-relaxed flex-1">
                          {produto.descricao}
                        </p>
                      )}
                      <p className="font-black text-lg text-iw-navy">
                        {formatarPreco(produto.preco_centavos)}
                      </p>

                      {gratuito && ehPdf ? (
                        <Link
                          href={`/api/biblioteca/${produto.id}?modo=${
                            produto.tipo === "PDF_DOWNLOAD" ? "download" : "ler"
                          }`}
                          className="text-center bg-iw-gold hover:opacity-90 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-opacity"
                        >
                          {produto.tipo === "PDF_DOWNLOAD" ? "Baixar grátis" : "Ler grátis"}
                        </Link>
                      ) : (
                        <AdicionarAoCarrinhoBotao
                          productId={produto.id}
                          titulo={produto.titulo}
                          precoCentavos={produto.preco_centavos}
                          tipo={produto.tipo}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {(!produtos || produtos.length === 0) && (
          <section className="max-w-3xl mx-auto px-6 py-20 text-center">
            <p className="text-iw-muted text-sm">
              Nenhum produto disponível no momento. Volte em breve.
            </p>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
