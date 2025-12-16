import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { SocialProvider } from 'src/modules/auth/const/auth.const';

export class CreateSocialUserDto {
  @IsNotEmpty()
  @IsString()
  sub: string;

  @IsNotEmpty()
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  providerEmail: string;

  @IsNotEmpty()
  @IsBoolean()
  isPrimary: boolean;
}
