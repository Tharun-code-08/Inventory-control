export type CursorPage = {
    take: number;
    cursor?: string;
};
export declare function clampTake(take?: number): number;
export declare function prismaCursorArgs(page: CursorPage): {
    take: number;
    skip?: number;
    cursor?: {
        id: string;
    };
    skipCursor?: boolean;
};
export declare function buildMeta<T extends {
    id: string;
}>(rows: T[], take: number): {
    items: T[];
    meta: {
        nextCursor: string | null;
        limit: number;
        hasMore: boolean;
    };
};
