"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
// Link daqui é sempre para /api/biblioteca/... (rota de API, fora de
// [locale]) — usa o Link puro do Next, não o de @/i18n/navigation, senão
// ganharia prefixo de idioma numa rota de API que não tem.
import Link from "next/link";
import { GraduationCap, Package, FileDown, BookOpenCheck } from "lucide-react";
import AdicionarAoCarrinhoBotao from "./AdicionarAoCarrinhoBotao";

interface Produto {
  id: string;
  tipo: "CURSO_AVULSO" | "MATERIAL_FISICO" | "PDF_DOWNLOAD" | "PDF_VIRTUAL";
  titulo: string;
  descricao: string | null;
  preco_centavos: number;
  imagem_url: string | null;
}

const ICONES: Record<Produto["tipo"], typeof GraduationCap> = {
  CURSO_AVULSO: GraduationCap,
  MATERIAL_FISICO: Package,
  PDF_DOWNLOAD: FileDown,
  PDF_VIRTUAL: BookOpenCheck,
};

// "as const satisfies" preserva os literais ("cursoAvulso", etc.) em vez de
// alargar pra "string" — o t() do next-intl exige o tipo exato da chave de
// mensagem, não aceita template literal genérico "categorias.${string}".
const CHAVES_CATEGORIA = {
  CURSO_AVULSO: "cursoAvulso",
  MATERIAL_FISICO: "materialFisico",
  PDF_DOWNLOAD: "pdfDownload",
  PDF_VIRTUAL: "pdfVirtual",
} as const satisfies Record<Produto["tipo"], string>;

// ============================================================
// LojaCatalogo — menu lateral de categorias (Cursos Avulsos,
// Material Físico, PDFs para Baixar, Leitura no Portal); ao
// clicar numa categoria, mostra só os produtos daquele tipo.
// ============================================================

export default function LojaCatalogo({ porTipo }: { porTipo: Record<string, Produto[]> }) {
  const t = useTranslations("loja");

  function formatarPreco(centavos: number) {
    if (centavos === 0) return t("gratis");
    return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
  }

  const tiposComItens = (Object.keys(ICONES) as Produto["tipo"][]).filter(
    (tipo) => porTipo[tipo]?.length
  );

  const [ativo, setAtivo] = useState<Produto["tipo"] | null>(tiposComItens[0] ?? null);

  if (tiposComItens.length === 0 || !ativo) return null;

  const IconAtiva = ICONES[ativo];
  const itensAtivos = porTipo[ativo] ?? [];

  return (
    <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3">
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tiposComItens.map((tipo) => {
            const Icon = ICONES[tipo];
            const selecionado = tipo === ativo;
            return (
              <button
                key={tipo}
                onClick={() => setAtivo(tipo)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap transition-colors ${
                  selecionado
                    ? "bg-[#E88D0C] text-white border border-black"
                    : "bg-iw-bg border border-iw-border text-iw-navy hover:border-iw-gold"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t(`categorias.${CHAVES_CATEGORIA[tipo]}`)}
                <span className={selecionado ? "text-white/70" : "text-iw-muted"}>
                  ({porTipo[tipo]!.length})
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="lg:col-span-9">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-black border-2 border-[#E88D0C] flex items-center justify-center">
            <IconAtiva className="w-5 h-5 text-[#E88D0C]" />
          </div>
          <h2 className="text-xl font-black tracking-tight">{t(`categorias.${CHAVES_CATEGORIA[ativo]}`)}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {itensAtivos.map((produto) => {
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
                    className="text-center bg-[#E88D0C] hover:opacity-90 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-opacity border border-black"
                  >
                    {produto.tipo === "PDF_DOWNLOAD" ? t("baixarGratis") : t("lerGratis")}
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
      </div>
    </section>
  );
}
