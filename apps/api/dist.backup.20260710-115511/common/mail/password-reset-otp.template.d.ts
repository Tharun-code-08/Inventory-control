export type PasswordResetOtpEmailContent = {
    userName: string;
    email: string;
    otpCode: string;
    expiresMinutes: number;
};
export declare function passwordResetOtpSubject(): string;
export declare function passwordResetOtpText(content: PasswordResetOtpEmailContent): string;
export declare function passwordResetOtpHtml(content: PasswordResetOtpEmailContent): string;
