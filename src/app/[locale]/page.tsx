import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  { valor: "388", key: "igrejas" },
  { valor: "22.126", key: "membros" },
  { valor: "802", key: "alunos" },
  { valor: "76", key: "anos" },
] as const;

const SERVICOS = [
  { id: "cursos", icon: GraduationCap, key: "cursos" },
  { id: "reciclagem", icon: RefreshCw, key: "reciclagem" },
  { id: "teologia", icon: Layers, key: "teologia" },
  { id: "treinamento", icon: BookOpen, key: "treinamento" },
] as const;

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="w-full bg-iw-surface text-iw-navy iw-scope-preto">
      <PublicHeader />

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-iw-bg">
          <div className="max-w-7xl mx-auto px-6 pt-3 md:pt-4 grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-6 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-iw-navy/5 border border-iw-navy/20 text-iw-navy text-base font-bold px-4 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-iw-gold rounded-full animate-pulse" />
                {t("hero.badge")}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-4 pb-6 md:pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <HeroAcessoImagem />
            </div>

            <div className="lg:col-span-6 flex flex-col gap-6">
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                {t("hero.tituloPrefixo")}{" "}
                <span className="text-[#E88D0C]">{t("hero.tituloDestaque")}</span>
                {t("hero.tituloSufixo")}
              </h1>

              <p className="text-black font-bold text-base md:text-lg leading-relaxed max-w-xl">
                {t("hero.subtitulo")}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link
                  href="/inscricao"
                  className="bg-[#E88D0C] hover:opacity-90 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-opacity border border-black"
                >
                  {t("hero.ctaInscricao")}
                </Link>
                <Link
                  href="/login"
                  className="border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-7 py-3.5 rounded-xl text-sm transition-colors"
                >
                  {t("hero.ctaLogin")}
                </Link>
              </div>

              <a
                href="https://www.google.com/maps/search/?api=1&query=Rua+Alfredo+Guedes%2C+1950%2C+Bairro+Alto%2C+Piracicaba+-+SP%2C+13419-080"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-iw-navy text-base font-semibold hover:text-iw-gold transition-colors w-fit"
              >
                <MapPin className="w-4 h-4 text-iw-gold shrink-0" />
                {t("hero.endereco")}
              </a>
            </div>
          </div>
        </section>

        {/* ── NÚMEROS ── */}
        <section className="bg-iw-navy border-t-2 border-b-2 border-iw-gold/40">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
              {NUMEROS.map((item) => (
                <div key={item.key} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold">{item.valor}</div>
                  <div className="text-white text-sm font-medium mt-1 uppercase tracking-wide">
                    {t(`numeros.${item.key}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVIÇOS ── */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              {t("servicos.tituloSecao")}
            </h2>
            <p className="text-iw-muted text-base max-w-2xl mx-auto">
              {t("servicos.subtituloSecao")}
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
                  <div className="w-12 h-12 rounded-xl bg-black border-2 border-[#E88D0C] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#E88D0C]" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="font-extrabold text-lg leading-tight">
                      {t(`servicos.${servico.key}.titulo`)}
                    </h3>
                    <p className="text-iw-muted text-sm leading-relaxed">
                      {t(`servicos.${servico.key}.descricao`)}
                    </p>
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
              <h2 className="text-2xl font-black tracking-tight">{t("sobre.titulo")}</h2>
              <p className="text-black text-lg leading-relaxed text-justify">
                {t("sobre.texto")}
              </p>
              <Link
                href="/sobre"
                className="text-iw-gold font-bold text-sm hover:underline inline-flex items-center gap-1 w-fit"
              >
                {t("sobre.link")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-iw-navy rounded-2xl p-8 text-white sticky top-28">
                <h3 className="text-xl font-extrabold mb-2">{t("cta.titulo")}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  {t("cta.texto")}
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/inscricao"
                    className="w-full text-center bg-[#E88D0C] hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm transition-opacity border border-black"
                  >
                    {t("cta.ctaInscricao")}
                  </Link>
                  <Link
                    href="/login"
                    className="w-full text-center border border-white/15 hover:border-white/30 text-white/80 hover:text-white font-semibold py-3 rounded-xl text-sm transition-all"
                  >
                    {t("cta.ctaLogin")}
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
