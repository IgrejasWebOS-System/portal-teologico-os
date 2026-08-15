import { Instagram, Facebook, Mail, MapPin } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

// ============================================================
// FloatingSocialIcons — ícones de redes sociais fixos no lado
// esquerdo da tela, em coluna (vertical), sempre visíveis durante
// o scroll da home. Mesmos links usados no rodapé (PublicFooter).
//
// Padrão visual único pros 5 ícones: fundo preto, borda laranja
// (#E88D0C), desenho interno também laranja (#E88D0C).
// ============================================================

const ICON_BASE =
  "w-[45px] h-[45px] rounded-full bg-black border-2 border-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg";

export default function FloatingSocialIcons() {
  return (
    <div className="fixed right-4 top-1/2 translate-y-[calc(-50%-88px)] z-40 flex flex-col items-center gap-3">
      <a
        href="https://instagram.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram do CETADP"
        className={ICON_BASE}
      >
        <Instagram className="w-4 h-4 text-[#E88D0C]" />
      </a>
      <a
        href="https://facebook.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook do CETADP"
        className={ICON_BASE}
      >
        <Facebook className="w-4 h-4 text-[#E88D0C]" fill="#E88D0C" />
      </a>
      <a
        href="https://wa.me/5519998121950"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp do CETADP"
        className={ICON_BASE}
      >
        <WhatsAppIcon className="w-4 h-4 text-[#E88D0C]" />
      </a>
      <a
        href="mailto:cetadp@gmail.com"
        aria-label="E-mail do CETADP"
        className={ICON_BASE}
      >
        <Mail className="w-4 h-4 text-[#E88D0C]" />
      </a>
      <a
        href="https://www.google.com/maps/search/?api=1&query=Rua+Alfredo+Guedes+1950+Piracicaba+SP"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Localização do CETADP"
        className={ICON_BASE}
      >
        <MapPin className="w-4 h-4 text-[#E88D0C]" />
      </a>
    </div>
  );
}
