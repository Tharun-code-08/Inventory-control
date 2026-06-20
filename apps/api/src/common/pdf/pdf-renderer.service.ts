import { Injectable } from '@nestjs/common';
import { HtmlToPdfService } from './html-to-pdf.service';

export interface PdfRenderOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
  landscape?: boolean;
  timeout?: number;
}

@Injectable()
export class PdfRendererService {
  constructor(private readonly htmlToPdf: HtmlToPdfService) {}

  async renderPdf(html: string, _options?: PdfRenderOptions): Promise<Buffer> {
    return this.htmlToPdf.render(html);
  }
}
