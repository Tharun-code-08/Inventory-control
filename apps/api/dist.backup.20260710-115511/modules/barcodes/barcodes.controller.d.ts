import type { RequestUser } from '../../common/types/request-user';
import { BarcodesService } from './barcodes.service';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { LookupBarcodeDto } from './dto/lookup-barcode.dto';
import { ListBarcodesDto } from './dto/list-barcodes.dto';
import { UpdateBarcodeDto } from './dto/update-barcode.dto';
import { MarkInvalidBarcodeDto } from './dto/mark-invalid-barcode.dto';
export declare class BarcodesController {
    private readonly barcodes;
    constructor(barcodes: BarcodesService);
    lookup(user: RequestUser, query: LookupBarcodeDto): Promise<{
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
            gstRate: import("@prisma/client/runtime/library").Decimal;
            purchasePrice: import("@prisma/client/runtime/library").Decimal;
            sellingPrice: import("@prisma/client/runtime/library").Decimal;
            barcodes: {
                id: string;
                barcode: string;
                barcodeType: import(".prisma/client").$Enums.BarcodeType;
                isPrimary: boolean;
            }[];
        };
        policy?: undefined;
    }>;
    scanLogs(user: RequestUser, take?: string): Promise<({
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
    list(user: RequestUser, productId: string): Promise<({
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
    listAll(user: RequestUser, query: ListBarcodesDto): Promise<{
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
    generate(user: RequestUser, productId: string): Promise<{
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
    remove(user: RequestUser, id: string): Promise<{
        deleted: boolean;
    }>;
    markInvalid(user: RequestUser, dto: MarkInvalidBarcodeDto): Promise<{
        success: boolean;
    }>;
}
