import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    minLength: 10,
    description:
      'At least 10 characters and must include at least one letter, one number, and one special character.',
  })
  @IsString()
  @MinLength(10, { message: 'New password must be at least 10 characters long.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'New password must include at least one letter, one number, and one special character.',
  })
  newPassword!: string;
}
