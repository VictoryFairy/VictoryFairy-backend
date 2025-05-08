import { Expose } from 'class-transformer';
import { IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class CheckLocalAuthDto extends BaseInternalDto {
  @Expose({ name: 'user_id' })
  @IsNumber()
  userId: number;
}
