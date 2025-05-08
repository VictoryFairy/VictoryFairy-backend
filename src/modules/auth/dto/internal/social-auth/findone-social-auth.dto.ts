import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { Expose } from 'class-transformer';

export class FindOneResultSocialAuthDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  sub: string;

  @IsNotEmpty()
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'user_id' })
  userId: number;
}
