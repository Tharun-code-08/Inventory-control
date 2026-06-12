import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { AlertType, NotificationPriority, NotificationModule, NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Title of the notification',
    example: 'Stock Out Alert',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Message body of the notification',
    example: 'Product SKU-001 is out of stock',
  })
  @IsString()
  message: string;

  @ApiProperty({
    enum: AlertType,
    description: 'Type of notification',
    example: 'LOW_STOCK',
  })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({
    enum: NotificationPriority,
    description: 'Priority level of the notification',
    example: 'HIGH',
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @ApiProperty({
    enum: NotificationModule,
    description: 'Module that triggered this notification',
    example: 'INVENTORY',
  })
  @IsEnum(NotificationModule)
  module: NotificationModule;

  @ApiProperty({
    description: 'Type of reference (e.g., product, goods_receipt)',
    example: 'product',
    required: false,
  })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({
    description: 'ID of the referenced entity',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @ApiProperty({
    description: 'Deep link URL to open the relevant screen',
    example: '/products/550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsString()
  @IsOptional()
  deepLink?: string;

  @ApiProperty({
    description: 'Action URL for external actions',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    description: 'User ID to send notification to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'When the notification should expire (30 days from now by default)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: AlertType })
  type: AlertType;

  @ApiProperty({ enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty({ enum: NotificationModule })
  module: NotificationModule;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({ required: false, nullable: true })
  referenceType?: string | null;

  @ApiProperty({ required: false, nullable: true })
  referenceId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  deepLink?: string | null;

  @ApiProperty({ required: false, nullable: true })
  actionUrl?: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ required: false, nullable: true })
  readAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false, nullable: true })
  expiresAt?: Date | null;
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Notification ID to mark as read',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  notificationId: string;
}

export class UpdateNotificationStatusDto {
  @ApiProperty({
    enum: NotificationStatus,
    description: 'New status for the notification',
  })
  @IsEnum(NotificationStatus)
  status: NotificationStatus;
}

export class NotificationFilterDto {
  @ApiProperty({
    description: 'Filter by read status',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({
    description: 'Filter by module',
    enum: NotificationModule,
    required: false,
  })
  @IsEnum(NotificationModule)
  @IsOptional()
  module?: NotificationModule;

  @ApiProperty({
    description: 'Filter by priority',
    enum: NotificationPriority,
    required: false,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiProperty({
    description: 'Filter by notification type',
    enum: AlertType,
    required: false,
  })
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @ApiProperty({
    description: 'Pagination: page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Pagination: items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  hasMore: boolean;
}
