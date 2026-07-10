import { MediaAssetType } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
export type StoreMediaAssetArgs = {
    file: Express.Multer.File;
    type: MediaAssetType;
    scope: {
        companyId?: string | null;
        shopId?: string | null;
    };
};
export type StoredMediaAsset = {
    assetKey: string;
    fileName: string;
    metadata: Record<string, string>;
};
export declare class MediaAssetStorageService {
    private readonly storage;
    constructor(storage: StorageService);
    storeAsset({ file, type, scope }: StoreMediaAssetArgs): Promise<StoredMediaAsset>;
}
