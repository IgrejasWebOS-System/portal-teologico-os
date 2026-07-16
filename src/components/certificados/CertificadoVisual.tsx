// ============================================================
// Modelo visual do certificado (tela), no estilo do certificado
// físico do CETADP: moldura dourada, triângulos decorativos nos
// cantos, título "CERTIFICADO" em destaque, nome do concluinte,
// curso em fonte cursiva, selo central e duas assinaturas.
// 100% CSS/HTML — sem depender de nenhuma imagem em /public
// (o projeto não tem arquivos de imagem versionados ainda).
// ============================================================

export interface CertificadoVisualProps {
  nomeAluno: string;
  nomeCurso: string;
  numeroCertificado: string;
  cargaHoraria?: number | null;
  assinaturaPresidente: string;
  assinaturaCoordenador: string;
  emitidoEm: string;
  cidade?: string;
}

export default function CertificadoVisual({
  nomeAluno,
  nomeCurso,
  numeroCertificado,
  cargaHoraria,
  assinaturaPresidente,
  assinaturaCoordenador,
  emitidoEm,
  cidade = "Piracicaba",
}: CertificadoVisualProps) {
  const dataFormatada = new Date(emitidoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="relative w-full aspect-[1.55/1] max-w-3xl mx-auto overflow-hidden rounded-sm shadow-2xl"
      style={{ background: "linear-gradient(135deg, #fdf8ef 0%, #f5ecd9 100%)" }}
    >
      {/* Moldura dourada */}
      <div className="absolute inset-3 border-[3px] border-[#c9a227] rounded-sm" />
      <div className="absolute inset-5 border border-[#c9a227]/60 rounded-sm" />

      {/* Triângulos decorativos — cantos */}
      <div
        className="absolute top-0 left-0 w-24 h-24"
        style={{ background: "#0f1f3d", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      <div
        className="absolute top-0 left-0 w-14 h-14"
        style={{ background: "#c9a227", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-28 h-28"
        style={{ background: "#0f1f3d", clipPath: "polygon(100% 100%, 0 100%, 100% 0)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-16 h-16"
        style={{ background: "#c9a227", clipPath: "polygon(100% 100%, 0 100%, 100% 0)" }}
      />
      <div
        className="absolute bottom-6 left-0 w-12 h-12"
        style={{ background: "#8a1538", clipPath: "polygon(0 100%, 100% 100%, 0 0)" }}
      />
      <div
        className="absolute top-6 right-0 w-10 h-10"
        style={{ background: "#8a1538", clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-10 sm:px-16 py-8">
        {/* Selo institucional (texto, sem logo) */}
        <div className="w-14 h-14 rounded-full border-2 border-[#c9a227] flex flex-col items-center justify-center mb-2 bg-[#fdf8ef]">
          <span className="text-[7px] font-black text-[#0f1f3d] leading-none">CETADP</span>
          <span className="text-[5px] text-[#0f1f3d]/70 leading-none mt-0.5">1968</span>
        </div>
        <p className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#0f1f3d] uppercase">
          Centro Educacional Teológico da
        </p>
        <p className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#0f1f3d] uppercase mb-2">
          Assembleia de Deus Piracicaba
        </p>

        <h1
          className="text-4xl sm:text-6xl font-black tracking-tight mb-3"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            background: "linear-gradient(180deg, #a8283f 0%, #7a1530 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          CERTIFICADO
        </h1>

        <p className="text-[10px] sm:text-xs text-[#0f1f3d]/70 tracking-wide mb-1">Certificamos que</p>
        <p
          className="text-xl sm:text-2xl font-bold text-[#0f1f3d] px-6 border-b border-[#c9a227] pb-1 mb-3 max-w-full truncate"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {nomeAluno}
        </p>

        <p className="text-[10px] sm:text-xs text-[#0f1f3d]/70 tracking-wide mb-1">
          participou e concluiu com aproveitamento o
        </p>
        <p
          className="text-2xl sm:text-3xl mb-1 px-4 max-w-full truncate"
          style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "#8a1538" }}
        >
          {nomeCurso}
        </p>
        {cargaHoraria ? (
          <p className="text-[9px] sm:text-[10px] text-[#0f1f3d]/60 mb-3">
            com carga horária de {cargaHoraria} horas
          </p>
        ) : (
          <div className="mb-3" />
        )}

        {/* Rodapé: data + selo + assinaturas */}
        <div className="w-full flex items-end justify-between mt-2 gap-4">
          <div className="text-left">
            <p className="text-[9px] sm:text-[10px] text-[#0f1f3d] font-semibold">
              {cidade}, {dataFormatada}
            </p>
            <p className="text-[7px] sm:text-[8px] text-[#0f1f3d]/50 font-mono mt-0.5">{numeroCertificado}</p>
          </div>

          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#c9a227] shrink-0 flex items-center justify-center"
            style={{ background: "radial-gradient(circle, #f3d98a 0%, #c9a227 100%)" }}
          >
            <span className="text-[6px] sm:text-[7px] font-black text-[#0f1f3d]">CETADP</span>
          </div>

          <div className="flex items-end gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#0f1f3d] border-t border-[#0f1f3d]/40 pt-1 px-2">
                {assinaturaPresidente}
              </p>
              <p className="text-[7px] sm:text-[8px] text-[#0f1f3d]/60 uppercase tracking-wide">Presidente</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#0f1f3d] border-t border-[#0f1f3d]/40 pt-1 px-2">
                {assinaturaCoordenador}
              </p>
              <p className="text-[7px] sm:text-[8px] text-[#0f1f3d]/60 uppercase tracking-wide">Coordenador Acadêmico</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
