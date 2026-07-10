export type PostalCodeLookupResult = {
    postalCode: string;
    city: string;
    district: string;
    state: string;
    country: string;
};
export declare class PostalCodesService {
    private readonly cache;
    lookup(postalCodeInput: string): Promise<PostalCodeLookupResult>;
    private normalizePostalCode;
    private parseLookupResponse;
}
