import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  RefreshCw,
  Layers,
  ArrowRight,
  MapPin,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import HeroAcessoImagem from "@/components/public/HeroAcessoImagem";

// ============================================================
// CETADP — Home institucional (rota pública "/")
// Porta de entrada do Portal EAD de Teologia. Apresenta a
// instituição e os serviços; o acesso ao ambiente de estudo
// (aulas, progresso, certificados) é feito via matrícula em
// /login, após aprovação da inscrição pela secretaria.
// ============================================================

const NUMEROS = [
  { valor: "388", label: "Igrejas no Campo de Piracicaba" },
  { valor: "22.126", label: "Membros Igreja" },
  { valor: "802", label: "Alunos em formação teológica" },
  { valor: "76", label: "Anos de história (desde 1948)" },
];

const SERVICOS = [
  {
    id: "cursos",
    icon: GraduationCap,
    titulo: "Cursos Oficiais",
    descricao:
      "Formação teológica reconhecida pela instituição, com carga horária, avaliações e certificado ao final de cada curso.",
  },
  {
    id: "reciclagem",
    icon: RefreshCw,
    titulo: "Cursos de Reciclagem",
    descricao:
      "Atualização periódica para obreiros e líderes já formados, mantendo a credencial ministerial em dia.",
  },
  {
    id: "teologia",
    icon: Layers,
    titulo: "Teologia em Vários Níveis",
    descricao:
      "Trilhas de básico a avançado, para quem está começando na obra e para quem busca aprofundamento ministerial.",
  },
  {
    id: "treinamento",
    icon: BookOpen,
    titulo: "Preparatórios & Capacitação",
    descricao:
      "Módulos de capacitação prática para departamentos, ministérios e liderança local, sob demanda dos campos.",
  },
];

export default function HomePage() {
  return (
    <div className="w-full bg-iw-surface text-iw-navy">
      <PublicHeader />

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-iw-bg">
          <div className="max-w-7xl mx-auto px-6 pt-3 md:pt-4 grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-6 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-iw-navy/5 border border-iw-navy/20 text-iw-navy text-base font-bold px-4 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-iw-gold rounded-full animate-pulse" />
                Centro Educacional Teológico Assembleias de Deus Piracicaba
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-4 pb-6 md:pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <HeroAcessoImagem />
            </div>

            <div className="lg:col-span-6 flex flex-col gap-6">
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                Formação teológica{" "}
                <span className="text-iw-gold">presencial e a distância</span>, para
                todos os campos e ministérios.
              </h1>

              <p className="text-black font-bold text-base md:text-lg leading-relaxed max-w-xl">
                CETADP — Centro Educacional Teológico Assembleias de Deus
                Piracicaba — capacita membros, obreiros e líderes
                evangélicos por meio de cursos oficiais, reciclagem e
                teologia em vários níveis, de forma presencial e a distância.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link
                  href="/inscricao"
                  className="bg-iw-gold hover:opacity-90 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-opacity"
                >
                  Fazer minha inscrição
                </Link>
                <Link
                  href="/login"
                  className="border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-7 py-3.5 rounded-xl text-sm transition-colors"
                >
                  Já sou aluno — Entrar →
                </Link>
              </div>

              <a
                href="https://www.google.com/maps/search/?api=1&query=Rua+Alfredo+Guedes%2C+1950%2C+Bairro+Alto%2C+Piracicaba+-+SP%2C+13419-080"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-iw-navy text-base font-semibold hover:text-iw-gold transition-colors w-fit"
              >
                <MapPin className="w-4 h-4 text-iw-gold shrink-0" />
                Rua Alfredo Guedes, 1950 — Bairro Alto — Piracicaba — SP — 13.419-080
              </a>
            </div>
          </div>
        </section>

        {/* ── NÚMEROS ── */}
        <section className="bg-iw-navy border-t-2 border-b-2 border-iw-gold/40">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
              {NUMEROS.map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold">{item.valor}</div>
                  <div className="text-white text-sm font-medium mt-1 uppercase tracking-wide">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVIÇOS ── */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              O que oferecemos
            </h2>
            <p className="text-iw-muted text-base max-w-2xl mx-auto">
              Trilhas de ensino teológico pensadas para servir vários campos e
              ministérios, dentro de um único portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICOS.map((servico) => {
              const Icon = servico.icon;
              return (
                <div
                  key={servico.id}
                  id={servico.id}
                  className="bg-iw-surface border border-iw-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-4 scroll-mt-40"
                >
                  <div className="w-12 h-12 rounded-xl bg-iw-gold/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-iw-gold" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="font-extrabold text-lg leading-tight">{servico.titulo}</h3>
                    <p className="text-iw-muted text-sm leading-relaxed">{servico.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── QUEM SOMOS + CTA ── */}
        <section className="bg-iw-bg border-t border-iw-border">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <h2 className="text-2xl font-black tracking-tight">Sobre o CETADP</h2>
              <p className="text-black text-lg leading-relaxed text-justify">
                O CETADP Centro Educacional Teológico das Assembleias de Deus
                Piracicaba, dedicada à formação de membros, obreiros e
                líderes para o exercício do ministério com fundamentação
                bíblica e teológica sólida. O Portal CETADP EAD reúne, em um
                único lugar, a inscrição, a matrícula e o acompanhamento do
                aluno do primeiro contato até a conclusão do curso.
              </p>
              <Link
                href="/sobre"
                className="text-iw-gold font-bold text-sm hover:underline inline-flex items-center gap-1 w-fit"
              >
                Conheça nossa história <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-iw-navy rounded-2xl p-8 text-white sticky top-28">
                <h3 className="text-xl font-extrabold mb-2">Pronto para começar?</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Faça sua inscrição em poucos minutos e sua matrícula é
                  confirmada na hora.
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/inscricao"
                    className="w-full text-center bg-iw-gold hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm transition-opacity"
                  >
                    Fazer minha inscrição
                  </Link>
                  <Link
                    href="/login"
                    className="w-full text-center border border-white/15 hover:border-white/30 text-white/80 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all"
                  >
                    Já tenho matrícula — fazer login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
