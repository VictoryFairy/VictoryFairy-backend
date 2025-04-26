import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { BaseInternalDto } from 'src/shared/dtos/base-internal.dto';
import { Transform } from 'class-transformer';

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
  @Transform(({ obj }) => obj.user_id)
  userId: number;
}
