import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { EMAIL_TEMPLATE_IDS, type EmailTemplateId } from '../email-notifications.constants';

export class EmailTemplateConfigDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];
}

export class EmailInternalAlertConfigDto {
  @IsBoolean()
  emailEnabled!: boolean;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  recipients!: string[];
}

export class EmailRemindersDto {
  @IsOptional()
  @IsBoolean()
  paymentReminderEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  paymentReminderDaysBefore?: number[];
}

export class EmailInternalAlertsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailInternalAlertConfigDto)
  lowStock?: EmailInternalAlertConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailInternalAlertConfigDto)
  rfqDeadline?: EmailInternalAlertConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailInternalAlertConfigDto)
  invoiceOverdue?: EmailInternalAlertConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailInternalAlertConfigDto)
  goodsReceiptPosted?: EmailInternalAlertConfigDto;
}

export class UpdateEmailNotificationsDto {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsObject()
  templates?: Partial<Record<EmailTemplateId, EmailTemplateConfigDto>>;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailRemindersDto)
  reminders?: EmailRemindersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailInternalAlertsDto)
  internalAlerts?: EmailInternalAlertsDto;
}

export class PreviewEmailTemplateDto {
  @IsIn([...EMAIL_TEMPLATE_IDS])
  templateId!: EmailTemplateId;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailTemplateConfigDto)
  template?: EmailTemplateConfigDto;

  @IsOptional()
  @IsObject()
  sampleContext?: Record<string, string>;
}
