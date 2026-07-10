export type RfqInviteEmailContent = {
    supplierName: string;
    rfqNumber: string;
    rfqTitle: string;
    deadline?: string | null;
    portalUrl: string;
    accessCode: string;
};
export declare function rfqInviteSubject(content: RfqInviteEmailContent): string;
export declare function rfqInviteText(content: RfqInviteEmailContent): string;
export declare function rfqInviteHtml(content: RfqInviteEmailContent): string;
