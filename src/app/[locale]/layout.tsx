import type { Metadata } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import FaqWidget from "@/components/faq/FaqWidget";
import { getFaqCategoriasAtivasAction } from "@/components/faq/actions";

// Fase 5 do BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md: tipografia oficial do
// Manual de Identidade Visual CETADP v1.0 (capítulo 07) — Source Sans 3
// pro corpo/interface, Cinzel pros títulos. Mantidos os mesmos nomes de
// variável CSS (--font-inter / --font-merriweather) pra não precisar
// tocar em globals.css além da paleta de cores.
const sourceSans = Source_Sans_3({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | CETADP",
    default: "CETADP — Portal EAD de Teologia",
  },
  description:
    "CETADP — Centro Educacional Teológico das Assembleias de Deus Piracicaba. Cursos oficiais, reciclagem e teologia em vários níveis, de forma presencial e a distância.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Guarda contra qualquer valor de [locale] fora dos 3 suportados
  // (ex.: alguém digitando /fr/login na mão) — cai em 404 em vez de
  // renderizar com um idioma inválido.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const faqCategorias = await getFaqCategoriasAtivasAction();

  return (
    <html lang={locale} className={`${sourceSans.variable} ${cinzel.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider>
          {children}
          <FaqWidget categoriasIniciais={faqCategorias} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
