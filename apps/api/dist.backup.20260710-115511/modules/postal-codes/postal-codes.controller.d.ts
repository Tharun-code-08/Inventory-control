import { PostalCodesService } from './postal-codes.service';
export declare class PostalCodesController {
    private readonly postalCodes;
    constructor(postalCodes: PostalCodesService);
    lookup(postalCode: string): Promise<import("./postal-codes.service").PostalCodeLookupResult>;
}
