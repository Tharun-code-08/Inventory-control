import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const severityValues = ['URGENT', 'WARNING', 'ACTION', 'INFO'] as const;
const channelValues = ['Email', 'SMS', 'In-app', 'WhatsApp'] as const;

export class NotificationRuleDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  notifyTo!: string;

  @ApiProperty({ enum: severityValues })
  @IsString()
  @IsIn(severityValues)
  severity!: (typeof severityValues)[number];

  @ApiProperty({ type: [String], enum: channelValues })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(channelValues, { each: true })
  channels!: Array<(typeof channelValues)[number]>;
}

export class NotificationGroupDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  moduleTags!: string[];

  @ApiProperty({ type: [NotificationRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationRuleDto)
  rules!: NotificationRuleDto[];
}

export class UpdateNotificationConfigDto {
  @ApiProperty({ type: [NotificationGroupDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationGroupDto)
  groups!: NotificationGroupDto[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  version?: string;
}
