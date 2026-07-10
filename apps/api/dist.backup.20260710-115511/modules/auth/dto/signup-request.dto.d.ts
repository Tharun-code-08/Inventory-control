export declare class SignupRequestDto {
    companyName: string;
    companyAddress?: string;
    plantName: string;
    plantAddress: string;
    contactPerson: string;
    mobile: string;
    adminName: string;
    email: string;
    password: string;
    confirmPassword: string;
    plan?: 'trial' | 'pro' | 'plus';
    billing?: 'monthly' | 'yearly';
}
