import { PartialType } from '@nestjs/swagger';
import { CreateGoodsIssueDto } from './create-goods-issue.dto';

export class UpdateGoodsIssueDto extends PartialType(CreateGoodsIssueDto) {}
