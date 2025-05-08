import { IsNotEmpty, IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';

export class AdjustRankRecordDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  team_id: number;
}
