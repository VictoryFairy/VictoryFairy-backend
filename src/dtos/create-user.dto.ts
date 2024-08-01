import { ApiProperty } from '@nestjs/swagger';
import { LoginUserDto } from './login-user.dto';
import { IsNumber, IsString } from 'class-validator';

export class CreateUserDto extends LoginUserDto {
  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty()
  @IsString()
  nickname: string;

  @ApiProperty()
  @IsNumber()
  teamId: number;
}
