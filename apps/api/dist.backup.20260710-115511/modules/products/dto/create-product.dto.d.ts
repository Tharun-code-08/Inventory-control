import { TaxPreference } from '@prisma/client';
import { ProductPlantDto } from './product-plant.dto';
import { ProductSpecificationDto } from './product-specification.dto';
export declare class CreateProductDto {
    productCode: string;
    description: string;
    uom: string;
    category: string;
    hsnCode?: string;
    materialGroup?: string;
    drawingReference?: string;
    brand?: string;
    taxPreference?: TaxPreference;
    gstRate?: number;
    purchasePrice: number;
    sellingPrice: number;
    isActive?: boolean;
    plants: ProductPlantDto[];
    specifications?: ProductSpecificationDto[];
}
