export type PasswordResetLinkEmailContent = {
    userName: string;
    email: string;
    resetUrl: string;
    expiresMinutes: number;
};
export declare function passwordResetLinkSubject(): string;
export declare function passwordResetLinkText(content: PasswordResetLinkEmailContent): string;
export declare function passwordResetLinkHtml(content: PasswordResetLinkEmailContent): string;
