import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseInternalDto } from 'src/common/dto/base-internal-dto';

export class CreateLocalAuthDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  password: string;
}
