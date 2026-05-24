import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ enum: ['pro', 'plus'] })
  @IsIn(['pro', 'plus'])
  plan!: 'pro' | 'plus';

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsIn(['monthly', 'yearly'])
  billing!: 'monthly' | 'yearly';
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  razorpay_order_id!: string;

  @ApiProperty()
  @IsString()
  razorpay_payment_id!: string;

  @ApiProperty()
  @IsString()
  razorpay_signature!: string;
}
