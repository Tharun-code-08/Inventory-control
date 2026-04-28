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
var ExportProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const exceljs_1 = require("exceljs");
const fs = require("fs/promises");
const Handlebars = require("handlebars");
const path = require("path");
const puppeteer = require("puppeteer");
const prisma_service_1 = require("../../prisma/prisma.service");
let ExportProcessor = ExportProcessor_1 = class ExportProcessor extends bullmq_1.WorkerHost {
    prisma;
    config;
    logger = new common_1.Logger(ExportProcessor_1.name);
    constructor(prisma, config) {
        super();
        this.prisma = prisma;
        this.config = config;
    }
    async process(job) {
        const dir = this.config.get('EXPORT_STORAGE_DIR', './storage/exports');
        await fs.mkdir(dir, { recursive: true });
        if (job.data.type === 'po-pdf') {
            const po = await this.prisma.purchaseOrderHeader.findUnique({
                where: { id: job.data.purchaseOrderId },
                include: { items: { include: { product: true } }, shop: true },
            });
            if (!po) {
                throw new Error('Purchase order not found');
            }
            const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
        <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
        </head><body>
        <h2>Purchase Order {{no}}</h2>
        <p>Date: {{d}} | Shop: {{shop}} | Supplier: {{supplier}}</p>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
        {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
        </tbody></table>
        </body></html>`);
            const html = tpl({
                no: po.poNumber,
                d: po.poDate.toISOString().slice(0, 10),
                shop: po.shop.shopName,
                supplier: po.supplier,
                lines: po.items.map((i) => ({
                    code: i.product.productCode,
                    qty: i.orderQty.toString(),
                    rate: i.rate.toString(),
                    value: i.lineValue.toString(),
                })),
            });
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            try {
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const fileName = `po-${job.data.purchaseOrderId}.pdf`;
                const outPath = path.join(dir, fileName);
                await page.pdf({ path: outPath, format: 'A4' });
                return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
            }
            finally {
                await browser.close();
            }
        }
        if (job.data.type === 'report-xlsx') {
            const workbook = new exceljs_1.default.Workbook();
            const sheet = workbook.addWorksheet(job.data.reportType);
            sheet.views = [{ state: 'frozen', ySplit: 2 }];
            sheet.addRow(['Retail IMS']);
            sheet.addRow([`Report: ${job.data.reportType}`]);
            sheet.addRow(['Generated', new Date().toISOString()]);
            sheet.addRow([]);
            const header = sheet.addRow(['Column A', 'Column B']);
            header.font = { bold: true };
            header.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' },
            };
            sheet.addRow(['Example', '123']);
            const fileName = `report-${job.data.reportType}-${job.id}.xlsx`;
            const outPath = path.join(dir, fileName);
            await workbook.xlsx.writeFile(outPath);
            return { downloadUrl: `/api/v1/export/files/${fileName}`, fileName };
        }
        this.logger.warn(`Unknown job type: ${JSON.stringify(job.data)}`);
        throw new Error('Unknown export job');
    }
};
exports.ExportProcessor = ExportProcessor;
exports.ExportProcessor = ExportProcessor = ExportProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('exports'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ExportProcessor);
//# sourceMappingURL=export.processor.js.map