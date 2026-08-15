import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import FaqWidget from "@/components/faq/FaqWidget";
import { getFaqCategoriasAtivasAction } from "@/components/faq/actions";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
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
    <html lang={locale} className={`${inter.variable} ${merriweather.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider>
          {children}
          <FaqWidget categoriasIniciais={faqCategorias} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
