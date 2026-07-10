import type { RequestUser } from '../../common/types/request-user';
import { CompanySettingsService } from './company-settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
export declare class CompanySettingsController {
    private readonly service;
    constructor(service: CompanySettingsService);
    list(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }[]>;
    get(user: RequestUser, key: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }>;
    upsert(user: RequestUser, key: string, dto: UpsertSettingDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        value: string;
        key: string;
    }>;
}
