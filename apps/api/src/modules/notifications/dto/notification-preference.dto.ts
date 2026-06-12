import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferenceDto {
  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is created',
    default: true,
  })
  @IsBoolean()
  grCreated?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is approved',
    default: true,
  })
  @IsBoolean()
  grApproved?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is rejected',
    default: true,
  })
  @IsBoolean()
  grRejected?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when PO approval is required',
    default: true,
  })
  @IsBoolean()
  poApprovalRequired?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when PO is approved',
    default: true,
  })
  @IsBoolean()
  poApproved?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when PO is rejected',
    default: true,
  })
  @IsBoolean()
  poRejected?: boolean = true;

  @ApiProperty({
    description: 'Receive low stock alerts',
    default: true,
  })
  @IsBoolean()
  lowStockAlert?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications when transfer is completed',
    default: true,
  })
  @IsBoolean()
  transferCompleted?: boolean = true;

  @ApiProperty({
    description: 'Receive notifications for inventory adjustments',
    default: true,
  })
  @IsBoolean()
  inventoryAdjustment?: boolean = true;

  @ApiProperty({
    description: 'Receive login alerts',
    default: true,
  })
  @IsBoolean()
  loginAlert?: boolean = true;

  @ApiProperty({
    description: 'Receive device alerts',
    default: true,
  })
  @IsBoolean()
  deviceAlert?: boolean = true;

  @ApiProperty({
    description: 'Enable push notifications',
    default: true,
  })
  @IsBoolean()
  pushEnabled?: boolean = true;

  @ApiProperty({
    description: 'Enable email notifications',
    default: false,
  })
  @IsBoolean()
  emailEnabled?: boolean = false;
}

export class NotificationPreferenceResponseDto extends NotificationPreferenceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is created',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  grCreated?: boolean;

  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is approved',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  grApproved?: boolean;

  @ApiProperty({
    description: 'Receive notifications when Goods Receipt is rejected',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  grRejected?: boolean;

  @ApiProperty({
    description: 'Receive notifications when PO approval is required',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  poApprovalRequired?: boolean;

  @ApiProperty({
    description: 'Receive notifications when PO is approved',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  poApproved?: boolean;

  @ApiProperty({
    description: 'Receive notifications when PO is rejected',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  poRejected?: boolean;

  @ApiProperty({
    description: 'Receive low stock alerts',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  lowStockAlert?: boolean;

  @ApiProperty({
    description: 'Receive notifications when transfer is completed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  transferCompleted?: boolean;

  @ApiProperty({
    description: 'Receive notifications for inventory adjustments',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  inventoryAdjustment?: boolean;

  @ApiProperty({
    description: 'Receive login alerts',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  loginAlert?: boolean;

  @ApiProperty({
    description: 'Receive device alerts',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  deviceAlert?: boolean;

  @ApiProperty({
    description: 'Enable push notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiProperty({
    description: 'Enable email notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;
}
