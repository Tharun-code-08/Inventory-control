import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PdfClusterService } from './pdf-cluster.service';

export interface RenderContext {
  documentType: string;
  data: Record<string, any>;
  branding?: {
    logoUrl?: string;
    companyName?: string;
    colors?: Record<string, string>;
  };
}

@Injectable()
export class PdfRendererService {
  private readonly logger = new Logger(PdfRendererService.name);
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templatesDir = path.join(process.cwd(), 'src/common/pdf/templates');

  constructor(private readonly pdfCluster: PdfClusterService) {
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers() {
    // Register custom Handlebars helpers for PDF formatting
    Handlebars.registerHelper('currency', (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    });

    Handlebars.registerHelper('date', (value: Date, format: string) => {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
    });

    Handlebars.registerHelper('qty', (value: number) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    });

    Handlebars.registerHelper('if_eq', function (a: any, b: any, opts: any) {
      return a === b ? opts.fn(this) : opts.inverse(this);
    });
  }

  async renderPdf(context: RenderContext): Promise<Buffer> {
    try {
      // Load template
      const template = await this.loadTemplate(context.documentType);

      // Compile and render HTML
      const html = template(context);

      // Generate PDF from HTML
      const pdf = await this.pdfCluster.renderPdf(html, {
        filename: `${context.documentType}.pdf`,
        scale: 1,
      });

      return pdf;
    } catch (error) {
      this.logger.error(`PDF rendering failed for ${context.documentType}: ${(error as Error).message}`);
      throw error;
    }
  }

  private async loadTemplate(documentType: string): Promise<Handlebars.TemplateDelegate> {
    // Check cache
    if (this.templates.has(documentType)) {
      return this.templates.get(documentType)!;
    }

    try {
      // Load template file
      const templatePath = path.join(this.templatesDir, `${documentType}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // Compile template
      const compiled = Handlebars.compile(templateContent);
      this.templates.set(documentType, compiled);

      this.logger.debug(`Template loaded: ${documentType}`);
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load template ${documentType}: ${(error as Error).message}`);
      throw new Error(`Template not found: ${documentType}`);
    }
  }

  // Preload common templates at startup
  async preloadTemplates(documentTypes: string[]) {
    for (const type of documentTypes) {
      try {
        await this.loadTemplate(type);
        this.logger.log(`Preloaded template: ${type}`);
      } catch (error) {
        this.logger.warn(`Failed to preload template ${type}: ${(error as Error).message}`);
      }
    }
  }
}
