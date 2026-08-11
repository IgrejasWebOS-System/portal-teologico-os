import { Instagram, Facebook, Mail, MapPin } from "lucide-react";
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
        className="w-10 h-10 rounded-full hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
        style={{
          background:
            "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
        }}
      >
        <Instagram className="w-4 h-4 text-white" />
      </a>
      <a
        href="https://facebook.com/cetadp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook do CETADP"
        className="w-10 h-10 rounded-full bg-[#1877F2] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <Facebook className="w-4 h-4 text-white" fill="white" />
      </a>
      <a
        href="https://wa.me/5519998121950"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp do CETADP"
        className="w-10 h-10 rounded-full bg-[#25D366] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <WhatsAppIcon className="w-4 h-4 text-white" />
      </a>
      <a
        href="mailto:cetadp@gmail.com"
        aria-label="E-mail do CETADP"
        className="w-10 h-10 rounded-full bg-black border-2 border-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <Mail className="w-4 h-4 text-[#E88D0C]" />
      </a>
      <a
        href="https://www.google.com/maps/search/?api=1&query=Rua+Alfredo+Guedes+1950+Piracicaba+SP"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Localização do CETADP"
        className="w-10 h-10 rounded-full bg-[#E88D0C] hover:opacity-85 flex items-center justify-center transition-opacity shadow-lg"
      >
        <MapPin className="w-4 h-4 text-white" />
      </a>
    </div>
  );
}
