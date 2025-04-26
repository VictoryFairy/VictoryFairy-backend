import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dtos/base-internal.dto';

export class UpdateLocalAuthDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  password: string;
}
