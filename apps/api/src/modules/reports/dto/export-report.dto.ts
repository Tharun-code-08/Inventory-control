import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsString } from 'class-validator';

export class ExportReportDto {
  @ApiProperty()
  @IsString()
  reportType!: string;

  @ApiProperty()
  @IsObject()
  filters!: Record<string, unknown>;

  @ApiProperty({ enum: ['xlsx', 'pdf'] })
  @IsIn(['xlsx', 'pdf'])
  format!: 'xlsx' | 'pdf';
}
