export declare class CreateEmailSenderDto {
    displayName: string;
    email: string;
}
export declare class UpdateEmailSenderDto {
    displayName?: string;
    isPrimary?: boolean;
}
export declare class ConfigureSenderSmtpDto {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
}
export declare class VerifySenderOtpDto {
    otpCode: string;
}
