import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestPoCancelDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ConfirmPoCancelDto extends RequestPoCancelDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;
}
