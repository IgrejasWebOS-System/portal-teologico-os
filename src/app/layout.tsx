import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
