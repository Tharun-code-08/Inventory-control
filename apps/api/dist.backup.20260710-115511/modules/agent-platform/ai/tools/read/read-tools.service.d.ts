import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from "../../../../../prisma/prisma.service";
import { BarcodesService } from "../../../../barcodes/barcodes.service";
import { CustomersService } from "../../../../customers/customers.service";
import { InvoicesService } from "../../../../invoices/invoices.service";
import { ProductsService } from "../../../../products/products.service";
import { PurchaseOrdersService } from "../../../../purchase-orders/purchase-orders.service";
import { ReportsService } from "../../../../reports/reports.service";
import { SalesOrdersService } from "../../../../sales-orders/sales-orders.service";
import { ShopsService } from "../../../../shops/shops.service";
import { SuppliersService } from "../../../../suppliers/suppliers.service";
import { ToolRegistry } from '../tool-registry';
export declare class ReadToolsService implements OnModuleInit {
    private readonly registry;
    private readonly prisma;
    private readonly reports;
    private readonly products;
    private readonly barcodes;
    private readonly shops;
    private readonly suppliers;
    private readonly customers;
    private readonly purchaseOrders;
    private readonly salesOrders;
    private readonly invoices;
    constructor(registry: ToolRegistry, prisma: PrismaService, reports: ReportsService, products: ProductsService, barcodes: BarcodesService, shops: ShopsService, suppliers: SuppliersService, customers: CustomersService, purchaseOrders: PurchaseOrdersService, salesOrders: SalesOrdersService, invoices: InvoicesService);
    onModuleInit(): void;
}
