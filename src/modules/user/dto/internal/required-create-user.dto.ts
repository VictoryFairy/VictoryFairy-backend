import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class RequiredCreateUserDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  image: string;

  @IsNotEmpty()
  @IsString()
  nickname: string;

  @IsNotEmpty()
  @IsNumber()
  teamId: number;
}
