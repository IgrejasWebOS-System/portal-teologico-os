import Link from "next/link";
import { Target, BookOpen, Users } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Quem Somos",
};

const PILARES = [
  {
    icon: Target,
    titulo: "Missão",
    texto:
      "Capacitar membros, obreiros e líderes das Assembleias de Deus em Piracicaba com formação teológica sólida, de forma presencial e a distância.",
  },
  {
    icon: BookOpen,
    titulo: "Ensino",
    texto:
      "Cursos oficiais, reciclagem periódica e teologia em níveis progressivos — do básico ao avançado.",
  },
  {
    icon: Users,
    titulo: "Alcance",
    texto:
      "Um único portal a serviço de vários campos e ministérios, para que a distância nunca seja um obstáculo à formação.",
  },
];

export default function SobrePage() {
  return (
    <div className="w-full bg-iw-surface text-iw-navy">
      <PublicHeader />

      <main>
        <section className="bg-iw-bg">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-4">
            <Logo size="lg" variant="dark" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Quem é o CETADP
            </h1>
            <p className="text-iw-muted text-base max-w-2xl">
              O Centro Educacional Teológico das Assembleias de Deus Piracicaba
              é a instituição de ensino teológico voltada para a capacitação
              de membros, obreiros e líderes evangélicos, de forma presencial
              e a distância.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILARES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.titulo} className="bg-iw-surface border border-iw-border rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-iw-gold/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-iw-gold" />
                </div>
                <h3 className="font-extrabold text-lg mb-2">{p.titulo}</h3>
                <p className="text-iw-muted text-sm leading-relaxed">{p.texto}</p>
              </div>
            );
          })}
        </section>

        <section className="bg-iw-navy">
          <div className="max-w-4xl mx-auto px-6 py-14 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
              Quer estudar com o CETADP?
            </h2>
            <p className="text-white/60 text-sm max-w-xl mx-auto mb-8">
              Faça sua inscrição e a secretaria entra em contato com os
              próximos passos.
            </p>
            <Link
              href="/inscricao"
              className="inline-block bg-iw-gold hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-opacity"
            >
              Fazer minha inscrição
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
