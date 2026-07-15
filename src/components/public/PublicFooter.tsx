import Link from "next/link";
import { MapPin, Instagram, Facebook, Mail, Phone } from "lucide-react";
import Logo from "@/components/Logo";

export default function PublicFooter() {
  return (
    <footer className="bg-iw-navy text-white/70">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Logo size="sm" variant="light" />
            <span className="text-white font-extrabold text-lg">CETADP</span>
          </div>
          <p className="text-sm leading-relaxed max-w-md">
            Centro Educacional Teológico das Assembleias de Deus Piracicaba —
            capacitação de membros, obreiros e líderes evangélicos através de
            cursos oficiais, reciclagem e formação teológica em vários níveis.
          </p>

          <a
            href="https://www.google.com/maps/search/?api=1&query=Rua+Alfredo+Guedes%2C+1950%2C+Piracicaba+-+SP"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm hover:text-iw-gold transition-colors w-fit"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            Rua Alfredo Guedes, 1950 — Piracicaba - SP
          </a>

          <div className="flex items-center gap-3 mt-4">
            <a
              href="https://instagram.com/cetadp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram do CETADP"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com/cetadp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook do CETADP"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://wa.me/5519999551205"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp do CETADP"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href="mailto:cetadp@gmail.com"
              aria-label="E-mail do CETADP"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="!text-white font-bold text-sm mb-3">Ensino</h4>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/#cursos" className="hover:text-iw-gold transition-colors">Cursos Oficiais</Link></li>
            <li><Link href="/#reciclagem" className="hover:text-iw-gold transition-colors">Cursos de Reciclagem</Link></li>
            <li><Link href="/#teologia" className="hover:text-iw-gold transition-colors">Teologia — Níveis</Link></li>
            <li><Link href="/biblioteca" className="hover:text-iw-gold transition-colors">Biblioteca</Link></li>
            <li><Link href="/certificados" className="hover:text-iw-gold transition-colors">Validar Certificado</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="!text-white font-bold text-sm mb-3">Institucional</h4>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/sobre" className="hover:text-iw-gold transition-colors">Quem Somos</Link></li>
            <li><Link href="/inscricao" className="hover:text-iw-gold transition-colors">Inscreva-se</Link></li>
            <li><Link href="/login" className="hover:text-iw-gold transition-colors">Portal do Aluno</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-white flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 CETADP · Centro Educacional Teológico das Assembleias de Deus Piracicaba</span>
          <span>Portal EAD · IgrejasWebOS</span>
        </div>
      </div>
    </footer>
  );
}
