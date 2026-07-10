export declare class RequestPoCancelDto {
    reason: string;
}
export declare class ConfirmPoCancelDto extends RequestPoCancelDto {
    otp: string;
}
