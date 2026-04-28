import { PartialType } from '@nestjs/swagger';
import { CreateGoodsReceiptDto } from './create-goods-receipt.dto';

export class UpdateGoodsReceiptDto extends PartialType(CreateGoodsReceiptDto) {}
