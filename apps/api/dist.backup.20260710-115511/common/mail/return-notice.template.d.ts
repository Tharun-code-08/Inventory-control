export type ReturnNoticeLine = {
    code: string;
    description: string;
    grnQuantity: string;
    returnQuantity: string;
    reason: string;
    imageCount: number;
};
export type ReturnNoticeEmailContent = {
    supplierName: string;
    returnNumber: string;
    returnDate: string;
    grNumber: string;
    shopName: string;
    companyName: string;
    supplierRef?: string | null;
    remarks?: string | null;
    acknowledgementUrl: string;
    lines: ReturnNoticeLine[];
};
export declare function returnNoticeSubject(content: ReturnNoticeEmailContent): string;
export declare function returnNoticeText(content: ReturnNoticeEmailContent): string;
export declare function returnNoticeHtml(content: ReturnNoticeEmailContent): string;
