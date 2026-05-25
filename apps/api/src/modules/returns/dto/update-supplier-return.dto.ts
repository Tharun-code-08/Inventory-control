import { PartialType } from '@nestjs/swagger';
import { CreateSupplierReturnDto } from './create-supplier-return.dto';

export class UpdateSupplierReturnDto extends PartialType(CreateSupplierReturnDto) {}
