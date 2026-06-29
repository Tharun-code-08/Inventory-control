import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class Line {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsString()
  uom!: string;
}

export class CreateGoodsIssueDto {
  @ApiProperty()
  @IsDateString()
  giDate!: string;

  @ApiProperty()
  @IsUUID()
  shopId!: string;

  @ApiProperty({ enum: ['Sales Order', 'Production', 'Maintenance', 'Transfer', 'Damage', 'Others'], default: 'Others' })
  @Transform(({ value }) => value ?? 'Others')
  @IsString()
  issueType: string = 'Others';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [Line] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Line)
  items!: Line[];
}
