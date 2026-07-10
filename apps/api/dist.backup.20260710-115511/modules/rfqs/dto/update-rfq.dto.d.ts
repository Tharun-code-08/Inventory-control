import { CreateRfqDto } from './create-rfq.dto';
declare const UpdateRfqDto_base: import("@nestjs/common").Type<Partial<CreateRfqDto>>;
export declare class UpdateRfqDto extends UpdateRfqDto_base {
    ifUnmodifiedSince?: string;
}
export {};
