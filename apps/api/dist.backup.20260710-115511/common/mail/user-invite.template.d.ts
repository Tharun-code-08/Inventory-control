export type UserInviteEmailContent = {
    inviteUrl: string;
    companyName: string;
    inviteeEmail: string;
    inviteeName?: string;
    inviterName: string;
    roleName: string;
    shopName?: string | null;
    expiresHours: number;
};
export declare function userInviteSubject(companyName: string): string;
export declare function userInviteText(content: UserInviteEmailContent): string;
export declare function userInviteHtml(content: UserInviteEmailContent): string;
