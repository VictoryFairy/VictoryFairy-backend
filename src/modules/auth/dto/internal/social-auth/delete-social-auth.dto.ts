import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/common/dto/base-internal-dto';
import { SocialProvider } from 'src/modules/auth/const/auth.const';

export class DeleteSocialAuthDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsEnum(SocialProvider)
  provider: SocialProvider;
}
