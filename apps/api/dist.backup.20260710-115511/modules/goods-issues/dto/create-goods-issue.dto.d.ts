declare class Line {
    productId: string;
    quantity: number;
    uom: string;
}
export declare class CreateGoodsIssueDto {
    giDate: string;
    shopId: string;
    issueType?: string;
    otherReason?: string;
    issueReason?: string;
    remarks?: string;
    items: Line[];
}
export {};
