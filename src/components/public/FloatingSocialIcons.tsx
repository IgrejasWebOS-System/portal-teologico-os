import { Instagram, Facebook, Phone, Mail } from "lucide-react";

// ============================================================
// FloatingSocialIcons — ícones de redes sociais fixos no lado
// esquerdo da tela, em coluna (vertical), sempre visíveis durante
// o scroll da home. Mesmos links usados no rodapé (PublicFooter).
// ============================================================

export default function FloatingSocialIcons() {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">
      <a
        href="https://instagram.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram do CETADP"
        className="w-10 h-10 rounded-full bg-iw-navy text-white hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors shadow-lg"
      >
        <Instagram className="w-4 h-4" />
      </a>
      <a
        href="https://facebook.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook do CETADP"
        className="w-10 h-10 rounded-full bg-iw-navy text-white hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors shadow-lg"
      >
        <Facebook className="w-4 h-4" />
      </a>
      <a
        href="https://wa.me/5519999551205"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp do CETADP"
        className="w-10 h-10 rounded-full bg-iw-navy text-white hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors shadow-lg"
      >
        <Phone className="w-4 h-4" />
      </a>
      <a
        href="mailto:cetadp@gmail.com"
        aria-label="E-mail do CETADP"
        className="w-10 h-10 rounded-full bg-iw-navy text-white hover:bg-iw-gold hover:text-iw-navy flex items-center justify-center transition-colors shadow-lg"
      >
        <Mail className="w-4 h-4" />
      </a>
    </div>
  );
}
