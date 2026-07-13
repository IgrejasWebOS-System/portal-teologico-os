import { BookOpen, FileText, BookMarked, Newspaper } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Biblioteca",
};

// TODO (fora do escopo do MVP para o pitch de 24/07): esta página reúne as
// categorias da livraria/distribuidora do CETADP como referência inicial.
// A tratativa de catálogo, estoque e venda/distribuição em si ainda será
// definida — por ora cada seção só apresenta o que é.
const SECOES = [
  {
    id: "livros",
    icon: BookOpen,
    titulo: "Livros",
    texto:
      "Obras teológicas e devocionais comercializadas e distribuídas pela livraria do CETADP.",
  },
  {
    id: "apostilas",
    icon: FileText,
    titulo: "Apostilas",
    texto:
      "Material de apoio impresso e digital para os cursos oficiais, de reciclagem e de teologia.",
  },
  {
    id: "revista-ebd",
    icon: BookMarked,
    titulo: "Revista Escola Dominical",
    texto:
      "Edições trimestrais da revista usada nas aulas da Escola Bíblica Dominical.",
  },
  {
    id: "jornal-semeador",
    icon: Newspaper,
    titulo: "Jornal Semeador",
    texto:
      "Publicação periódica do CETADP com notícias, estudos e informes da instituição.",
  },
];

export default function BibliotecaPage() {
  return (
    <div className="w-full bg-iw-surface text-iw-navy">
      <PublicHeader />

      <main>
        <section className="bg-iw-bg">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-4">
            <Logo size="lg" variant="dark" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Biblioteca CETADP
            </h1>
            <p className="text-iw-muted text-base max-w-2xl">
              Livraria e distribuidora do CETADP — livros, apostilas, a
              Revista Escola Dominical e o Jornal Semeador, todos em um só
              lugar.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SECOES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                id={s.id}
                className="bg-iw-surface border border-iw-border rounded-2xl p-6 shadow-sm scroll-mt-32 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-iw-gold/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-iw-gold" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg mb-1">{s.titulo}</h3>
                  <p className="text-iw-muted text-sm leading-relaxed">{s.texto}</p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-iw-muted/70 mt-auto">
                  Catálogo em breve
                </span>
              </div>
            );
          })}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
