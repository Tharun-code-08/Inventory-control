import type { RequestUser } from '../../common/types/request-user';
import { DocumentSeriesService } from './document-series.service';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';
export declare class DocumentSeriesController {
    private readonly series;
    constructor(series: DocumentSeriesService);
    list(user: RequestUser, shopId?: string): Promise<import("./document-series.service").DocumentSeriesListRow[]>;
    updateCompanyDefaults(user: RequestUser, dto: UpdateDocumentSeriesDto): Promise<import("./document-series.service").DocumentSeriesListRow[]>;
    updateShopOverrides(user: RequestUser, shopId: string, dto: UpdateDocumentSeriesDto): Promise<import("./document-series.service").DocumentSeriesListRow[]>;
    deleteShopOverride(user: RequestUser, shopId: string, docType: string): Promise<import("./document-series.service").DocumentSeriesListRow[]>;
}
