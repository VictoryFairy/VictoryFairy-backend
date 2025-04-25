import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseInternalDto } from 'src/common/dto/base-internal-dto';
import { CheckLocalAuthDto } from 'src/modules/auth/dto/local-auth/check-local-auth.dto';

export class FindOneWithLocalAuthDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @IsOptional()
  @ValidateNested()
  @Expose({ name: 'local_auth' })
  @Type(() => CheckLocalAuthDto)
  localAuth: CheckLocalAuthDto | null;
}
