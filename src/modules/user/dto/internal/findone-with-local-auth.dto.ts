import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseInternalDto } from 'src/shared/dtos/base-internal-dto';
import { CheckLocalAuthDto } from 'src/modules/auth/dto/internal/local-auth/check-local-auth.dto';

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
  @Type(() => CheckLocalAuthDto)
  local_auth: CheckLocalAuthDto | null;
}
