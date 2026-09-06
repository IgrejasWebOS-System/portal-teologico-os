import QRCode from "qrcode";

// ============================================================
// Gera um QR Code (PNG em data URL) a partir de um link — usado
// pra imprimir/exibir o QR de auto-cadastro do aluno
// (ver admin/matriculas/ficha-rapida). Sem dependência de Storage:
// o PNG é gerado sob demanda e devolvido como data URL, então não
// precisa salvar arquivo nenhum — a secretaria tira print/imprime
// na hora.
// ============================================================

export async function gerarQrCodeDataUrl(conteudo: string): Promise<string> {
  return QRCode.toDataURL(conteudo, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });
}

// Mesma coisa, mas como PNG bruto (bytes) em vez de data URL — usado
// quando o QR precisa ser embutido direto num PDF (pdf-lib embedPng),
// que não aceita data URL, só bytes/Buffer/Uint8Array.
export async function gerarQrCodePngBytes(conteudo: string): Promise<Uint8Array> {
  return QRCode.toBuffer(conteudo, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
  });
}
