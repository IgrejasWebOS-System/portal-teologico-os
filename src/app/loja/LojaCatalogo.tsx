"use client";

import { useState } from "react";
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
// LojaCatalogo — menu lateral de categorias (Cursos Avulsos,
// Material Físico, PDFs para Baixar, Leitura no Portal); ao
// clicar numa categoria, mostra só os produtos daquele tipo.
// ============================================================

export default function LojaCatalogo({ porTipo }: { porTipo: Record<string, Produto[]> }) {
  const tiposComItens = (Object.keys(SECOES) as Produto["tipo"][]).filter(
    (tipo) => porTipo[tipo]?.length
  );

  const [ativo, setAtivo] = useState<Produto["tipo"] | null>(tiposComItens[0] ?? null);

  if (tiposComItens.length === 0 || !ativo) return null;

  const secaoAtiva = SECOES[ativo];
  const itensAtivos = porTipo[ativo] ?? [];
  const IconAtiva = secaoAtiva.icon;

  return (
    <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3">
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tiposComItens.map((tipo) => {
            const secao = SECOES[tipo];
            const Icon = secao.icon;
            const selecionado = tipo === ativo;
            return (
              <button
                key={tipo}
                onClick={() => setAtivo(tipo)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap transition-colors ${
                  selecionado
                    ? "bg-iw-gold text-white"
                    : "bg-iw-bg border border-iw-border text-iw-navy hover:border-iw-gold"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {secao.titulo}
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
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center">
            <IconAtiva className="w-5 h-5 text-iw-gold" />
          </div>
          <h2 className="text-xl font-black tracking-tight">{secaoAtiva.titulo}</h2>
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
      </div>
    </section>
  );
}
