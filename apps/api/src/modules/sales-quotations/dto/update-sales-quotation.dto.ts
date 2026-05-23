import { PartialType } from '@nestjs/swagger';
import { CreateSalesQuotationDto } from './create-sales-quotation.dto';

export class UpdateSalesQuotationDto extends PartialType(CreateSalesQuotationDto) {}
