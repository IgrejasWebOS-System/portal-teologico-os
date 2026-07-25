import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqCategorias = await getFaqCategoriasAtivasAction();

  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="antialiased">
        {children}
        <FaqWidget categoriasIniciais={faqCategorias} />
      </body>
    </html>
  );
}
