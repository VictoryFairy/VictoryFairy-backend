import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class CreateSocialAuthDto extends BaseInternalDto {
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
  @IsEmail()
  providerEmail: string;

  @IsNotEmpty()
  @IsBoolean()
  isPrimary: boolean;
}
