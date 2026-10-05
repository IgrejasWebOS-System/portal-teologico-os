// Declaracao minima de tipos para "pdf-parse" (o pacote nao traz tipos e
// @types/pdf-parse nao esta nas dependencias). Cobre so o que o projeto usa
// (provas-publicas/importar/actions.ts: pdfParse(buffer).text). Sem isso,
// `npm run type-check` (e o CI do PR) falha com TS7016.
declare module "pdf-parse" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
