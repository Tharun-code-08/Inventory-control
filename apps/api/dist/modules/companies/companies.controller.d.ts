import type { RequestUser } from '../../common/types/request-user';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompaniesService } from './companies.service';
export declare class CompaniesController {
    private readonly companies;
    constructor(companies: CompaniesService);
    list(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        address: string | null;
        companyCode: string;
        companyName: string;
    }[]>;
    create(user: RequestUser, dto: CreateCompanyDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        address: string | null;
        companyCode: string;
        companyName: string;
    }>;
    get(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        address: string | null;
        companyCode: string;
        companyName: string;
    }>;
    update(user: RequestUser, id: string, dto: UpdateCompanyDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        address: string | null;
        companyCode: string;
        companyName: string;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        address: string | null;
        companyCode: string;
        companyName: string;
    }>;
}
