import { Instagram, Facebook, Mail } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

// ============================================================
// FloatingSocialIcons — ícones de redes sociais fixos no lado
// esquerdo da tela, em coluna (vertical), sempre visíveis durante
// o scroll da home. Mesmos links usados no rodapé (PublicFooter).
// ============================================================

export default function FloatingSocialIcons() {
  return (
    <div className="fixed left-4 top-1/2 translate-y-[calc(-50%-88px)] z-40 flex flex-col items-center gap-3">
      <a
        href="https://instagram.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram do CETADP"
        className="w-10 h-10 rounded-full bg-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <Instagram className="w-4 h-4 text-black" />
      </a>
      <a
        href="https://facebook.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook do CETADP"
        className="w-10 h-10 rounded-full bg-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <Facebook className="w-4 h-4 text-black" />
      </a>
      <a
        href="https://wa.me/5519998121950"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp do CETADP"
        className="w-10 h-10 rounded-full bg-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <WhatsAppIcon className="w-4 h-4 text-black" />
      </a>
      <a
        href="mailto:cetadp@gmail.com"
        aria-label="E-mail do CETADP"
        className="w-10 h-10 rounded-full bg-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <Mail className="w-4 h-4 text-black" />
      </a>
    </div>
  );
}
