"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PdfRendererService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfRendererService = void 0;
const common_1 = require("@nestjs/common");
const Handlebars = require("handlebars");
const fs = require("fs/promises");
const path = require("path");
const pdf_cluster_service_1 = require("./pdf-cluster.service");
let PdfRendererService = PdfRendererService_1 = class PdfRendererService {
    pdfCluster;
    logger = new common_1.Logger(PdfRendererService_1.name);
    templates = new Map();
    templatesDir = path.join(process.cwd(), 'src/common/pdf/templates');
    constructor(pdfCluster) {
        this.pdfCluster = pdfCluster;
        this.registerHandlebarsHelpers();
    }
    registerHandlebarsHelpers() {
        Handlebars.registerHelper('currency', (value) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(value);
        });
        Handlebars.registerHelper('date', (value, _format) => {
            return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
        });
        Handlebars.registerHelper('qty', (value) => {
            const num = typeof value === 'number' ? value : parseFloat(value);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        });
        Handlebars.registerHelper('if_eq', function (a, b, opts) {
            return a === b ? opts.fn(this) : opts.inverse(this);
        });
    }
    async renderPdf(context) {
        try {
            const template = await this.loadTemplate(context.documentType);
            const html = template(context);
            const pdf = await this.pdfCluster.renderPdf(html, {
                filename: `${context.documentType}.pdf`,
                scale: 1,
            });
            return pdf;
        }
        catch (error) {
            this.logger.error(`PDF rendering failed for ${context.documentType}: ${error.message}`);
            throw error;
        }
    }
    async loadTemplate(documentType) {
        if (this.templates.has(documentType)) {
            return this.templates.get(documentType);
        }
        try {
            const templatePath = path.join(this.templatesDir, `${documentType}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const compiled = Handlebars.compile(templateContent);
            this.templates.set(documentType, compiled);
            this.logger.debug(`Template loaded: ${documentType}`);
            return compiled;
        }
        catch (error) {
            this.logger.error(`Failed to load template ${documentType}: ${error.message}`);
            throw new Error(`Template not found: ${documentType}`, { cause: error });
        }
    }
    async preloadTemplates(documentTypes) {
        for (const type of documentTypes) {
            try {
                await this.loadTemplate(type);
                this.logger.log(`Preloaded template: ${type}`);
            }
            catch (error) {
                this.logger.warn(`Failed to preload template ${type}: ${error.message}`);
            }
        }
    }
};
exports.PdfRendererService = PdfRendererService;
exports.PdfRendererService = PdfRendererService = PdfRendererService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pdf_cluster_service_1.PdfClusterService])
], PdfRendererService);
//# sourceMappingURL=pdf-renderer.service.js.map