declare module "word-extractor" {
  type Documento = { getBody(): string; getHeaders(opciones?: { includeFooters?: boolean }): string; getFootnotes(): string };
  export default class WordExtractor {
    extract(fuente: string | Buffer): Promise<Documento>;
  }
}
