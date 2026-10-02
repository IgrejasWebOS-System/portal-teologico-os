// ============================================================
// Pix estático (BR Code / EMV) — decisão do Joaquim em 14/09/2026: o
// aluno paga direto na conta do CETADP (Banco do Brasil, chave = CNPJ);
// SEM confirmação automática — a secretaria/professor confere pelo
// extrato e dá baixa manual (baixarParcelaAction / professorBaixarParcelaAction).
// Avaliar Pix via API do próprio BB (confirmação automática + dinheiro
// direto na conta) fica registrado como projeto futuro.
//
// Função pura (sem import de Node/Supabase) — roda tanto no servidor
// quanto no client, junto com a lib "qrcode" (já usada em utils/qrcode.ts)
// pra desenhar o QR a partir do texto "copia e cola" gerado aqui.
// ============================================================

export const DADOS_PIX_CETADP = {
  chave: "45042200000145", // CNPJ — mesma chave cadastrada no Banco do Brasil
  nomeRecebedor: "CETADP",
  cidade: "PIRACICABA",
  banco: "Banco do Brasil",
  agencia: "3552-1",
  contaCorrente: "33865-6",
  cnpjFormatado: "45.042.200/0001-45",
  razaoSocial: "Centro Educacional Teológico Assembleia de Deus em Piracicaba",
};

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "");
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — exigido pelo padrão Pix.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixEstaticoParams {
  valorCentavos: number;
  txid?: string; // referência (ex.: id curto da parcela) — só alfanumérico
  descricao?: string;
}

export function montarPayloadPix({ valorCentavos, txid, descricao }: PixEstaticoParams): string {
  const nome = semAcento(DADOS_PIX_CETADP.nomeRecebedor).slice(0, 25).toUpperCase();
  const cidade = semAcento(DADOS_PIX_CETADP.cidade).slice(0, 15).toUpperCase();
  const txidLimpo = (txid ? txid.replace(/[^A-Za-z0-9]/g, "") : "***").slice(0, 25) || "***";

  let merchantAccountInfo = tlv("00", "br.gov.bcb.pix") + tlv("01", DADOS_PIX_CETADP.chave);
  if (descricao) {
    merchantAccountInfo += tlv("02", semAcento(descricao).slice(0, 40));
  }

  const camposBase =
    tlv("00", "01") +
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", (valorCentavos / 100).toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", nome) +
    tlv("60", cidade) +
    tlv("62", tlv("05", txidLimpo));

  const semCrc = camposBase + "6304";
  return semCrc + crc16(semCrc);
}
