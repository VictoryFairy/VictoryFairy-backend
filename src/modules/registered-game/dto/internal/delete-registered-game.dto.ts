import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
export class DeleteRegisteredGameDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  gameId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
