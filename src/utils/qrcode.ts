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
