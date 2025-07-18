import { IsNotEmpty, IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class DeleteUserDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
