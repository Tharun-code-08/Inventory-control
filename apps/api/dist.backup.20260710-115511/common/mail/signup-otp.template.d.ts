export type SignupOtpEmailContent = {
    adminName: string;
    companyName: string;
    email: string;
    otpCode: string;
    expiresMinutes: number;
};
export declare function signupOtpSubject(companyName: string): string;
export declare function signupOtpText(content: SignupOtpEmailContent): string;
export declare function signupOtpHtml(content: SignupOtpEmailContent): string;
