import { IsNotEmpty, IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class InsertRankDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  team_id: number;

  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  active_year: number;
}
