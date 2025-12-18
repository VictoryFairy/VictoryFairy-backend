import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginLocalUserDto {
  @ApiProperty({
    example: 'example@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'should be hidden',
  })
  @IsString()
  password: string;
}
