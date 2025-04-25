import { IsNotEmpty, IsNumber } from 'class-validator';
import { BaseInternalDto } from 'src/common/dto/base-internal-dto';

export class TeamSelectIdDto extends BaseInternalDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
