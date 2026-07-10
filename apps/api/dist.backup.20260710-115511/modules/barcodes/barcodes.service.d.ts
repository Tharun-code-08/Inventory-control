import { Prisma, ScanAction, ScanSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { UpdateBarcodeDto } from './dto/update-barcode.dto';
import { ListBarcodesDto } from './dto/list-barcodes.dto';
import { CompanySettingsService } from '../company-settings/company-settings.service';
export declare class BarcodesService {
    private readonly prisma;
    private readonly companySettings;
    private readonly recentScans;
    constructor(prisma: PrismaService, companySettings: CompanySettingsService);
    private isDuplicateFire;
    private productScope;
    lookup(user: RequestUser, rawCode: string, action?: ScanAction, shopId?: string, source?: ScanSource): Promise<{
        found: false;
        barcode: string;
        duplicate: boolean;
        policy: "REJECT" | "AUTO_CREATE" | "ASK";
        matchedType?: undefined;
        product?: undefined;
    } | {
        found: true;
        barcode: string;
        duplicate: boolean;
        matchedType: import(".prisma/client").$Enums.BarcodeType | null;
        product: {
            id: string;
            isActive: boolean;
            description: string;
            productCode: string;
            uom: string;
            category: string;
            gstRate: Prisma.Decimal;
            purchasePrice: Prisma.Decimal;
            sellingPrice: Prisma.Decimal;
            barcodes: {
                id: string;
                barcode: string;
                barcodeType: import(".prisma/client").$Enums.BarcodeType;
                isPrimary: boolean;
            }[];
        };
        policy?: undefined;
    }>;
    listForProduct(user: RequestUser, productId: string): Promise<({
        supplier: {
            id: string;
            supplierName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        productId: string;
        barcode: string;
        supplierId: string | null;
        barcodeType: import(".prisma/client").$Enums.BarcodeType;
        isPrimary: boolean;
    })[]>;
    listAll(user: RequestUser, dto: ListBarcodesDto): Promise<{
        items: ({
            supplier: {
                id: string;
                supplierName: string;
            } | null;
            product: {
                id: string;
                description: string;
                productCode: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string | null;
            productId: string;
            barcode: string;
            supplierId: string | null;
            barcodeType: import(".prisma/client").$Enums.BarcodeType;
            isPrimary: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    create(user: RequestUser, productId: string, dto: CreateBarcodeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        productId: string;
        barcode: string;
        supplierId: string | null;
        barcodeType: import(".prisma/client").$Enums.BarcodeType;
        isPrimary: boolean;
    }>;
    update(user: RequestUser, id: string, dto: UpdateBarcodeDto): Promise<{
        supplier: {
            id: string;
            supplierName: string;
        } | null;
        product: {
            id: string;
            description: string;
            productCode: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        productId: string;
        barcode: string;
        supplierId: string | null;
        barcodeType: import(".prisma/client").$Enums.BarcodeType;
        isPrimary: boolean;
    }>;
    generateInternal(user: RequestUser, productId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        productId: string;
        barcode: string;
        supplierId: string | null;
        barcodeType: import(".prisma/client").$Enums.BarcodeType;
        isPrimary: boolean;
    }>;
    remove(user: RequestUser, barcodeId: string): Promise<{
        deleted: boolean;
    }>;
    markInvalid(user: RequestUser, rawCode: string, action?: ScanAction, shopId?: string, source?: ScanSource): Promise<{
        success: boolean;
    }>;
    scanLogs(user: RequestUser, take?: number): Promise<({
        product: {
            id: string;
            description: string;
            productCode: string;
        } | null;
    } & {
        shopId: string | null;
        userId: string;
        result: import(".prisma/client").$Enums.ScanResult;
        id: string;
        createdAt: Date;
        companyId: string;
        productId: string | null;
        barcode: string;
        action: import(".prisma/client").$Enums.ScanAction;
        source: import(".prisma/client").$Enums.ScanSource;
        sessionId: string | null;
    })[]>;
    private requireProduct;
    private log;
}
