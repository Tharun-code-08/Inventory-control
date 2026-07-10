export type SenderVerificationOtpContent = {
    displayName: string;
    email: string;
    otpCode: string;
    expiresMinutes: number;
    companyName: string;
};
export declare function senderVerificationOtpSubject(companyName: string): string;
export declare function senderVerificationOtpText(content: SenderVerificationOtpContent): string;
export declare function senderVerificationOtpHtml(content: SenderVerificationOtpContent): string;
