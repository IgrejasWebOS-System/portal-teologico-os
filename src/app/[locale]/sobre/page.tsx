import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Target, BookOpen, Users } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Logo from "@/components/Logo";

export async function generateMetadata() {
  const t = await getTranslations("sobre");
  return { title: t("metaTitulo") };
}

const DIRETORIA = [
  { cargoKey: "presidente", nomes: ["Pr. Dilmo dos Santos"] },
  { cargoKey: "primeiroVicePresidente", nomes: ["Pra. Marisa Galvão"] },
  { cargoKey: "segundoVicePresidente", nomes: ["Pr. Marcelo Trevisan"] },
  {
    cargoKey: "secretario",
    nomes: [
      "Pr. Amarinho de Melo",
      "Ev. Milena Pandolfo",
      "Ev. Ariane Bueno",
      "Ev. Josias Cardoso",
    ],
  },
  { cargoKey: "tesouraria", nomes: ["Pr. Antonio Pandolfo", "Pr. Márcio Siqueira"] },
  {
    cargoKey: "conselhoFiscal",
    nomes: ["Pr. Edmilson Maria", "Pr. Paulo Minharo", "Ev. Pedro Venâncio"],
  },
  {
    cargoKey: "conselhoTeologico",
    nomes: ["Pr. Carlos Arthuso", "Pr. Luiz Roberto", "Pr. Alexandre Medrano"],
  },
] as const;

const PILARES = [
  { key: "missao", icon: Target },
  { key: "ensino", icon: BookOpen },
  { key: "alcance", icon: Users },
] as const;

export default function SobrePage() {
  const t = useTranslations("sobre");

  return (
    <div className="w-full bg-iw-surface text-iw-navy iw-scope-preto">
      <PublicHeader />

      <main>
        <section className="bg-iw-bg">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-4">
            <Logo size="lg" variant="dark" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              {t("hero.titulo")}
            </h1>
            <p className="text-iw-muted text-base max-w-2xl">
              {t("hero.texto")}
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILARES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.key} className="bg-iw-surface border border-iw-border rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-black border-2 border-[#E88D0C] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#E88D0C]" />
                </div>
                <h3 className="font-extrabold text-lg mb-2">{t(`pilares.${p.key}.titulo`)}</h3>
                <p className="text-iw-muted text-sm leading-relaxed">{t(`pilares.${p.key}.texto`)}</p>
              </div>
            );
          })}
        </section>

        <section className="bg-iw-bg border-t border-iw-border">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
                {t("diretoria.titulo")}
              </h2>
              <p className="text-iw-muted text-sm max-w-xl mx-auto">
                {t("diretoria.subtitulo")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {DIRETORIA.map((item) => (
                <div
                  key={item.cargoKey}
                  className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm"
                >
                  <h3 className="font-extrabold text-sm text-iw-gold uppercase tracking-wider mb-2">
                    {t(`diretoria.cargos.${item.cargoKey}`)}
                  </h3>
                  <ul className="space-y-1">
                    {item.nomes.map((nome) => (
                      <li key={nome} className="text-iw-navy text-sm font-medium">
                        {nome}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-iw-navy">
          <div className="max-w-4xl mx-auto px-6 py-14 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
              {t("cta.titulo")}
            </h2>
            <p className="text-white/60 text-sm max-w-xl mx-auto mb-8">
              {t("cta.texto")}
            </p>
            <Link
              href="/inscricao"
              className="inline-block bg-[#E88D0C] hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-opacity border border-black"
            >
              {t("cta.botao")}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
