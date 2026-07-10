export type GstHsnMatch = {
    code: string;
    description: string;
};
export declare class GstHsnService {
    private readonly logger;
    search(query: string): Promise<GstHsnMatch[]>;
    private buildSearchTerms;
    private paramsForTerm;
    private fetchPortalRows;
    private rankMatches;
    private chunk;
}
