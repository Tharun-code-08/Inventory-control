import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
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

export class UpdateEmailNotificationsDto {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsObject()
  templates?: Partial<Record<EmailTemplateId, EmailTemplateConfigDto>>;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  reminders?: {
    paymentReminderEnabled?: boolean;
    paymentReminderDaysBefore?: number[];
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  internalAlerts?: {
    lowStock?: EmailInternalAlertConfigDto;
    rfqDeadline?: EmailInternalAlertConfigDto;
    invoiceOverdue?: EmailInternalAlertConfigDto;
    goodsReceiptPosted?: EmailInternalAlertConfigDto;
  };
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
