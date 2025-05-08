import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class DetermineGameStatusDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsString()
  status: string;

  @IsNotEmpty()
  @IsNumber()
  homeTeamScore: number;

  @IsNotEmpty()
  @IsNumber()
  awayTeamScore: number;

  @IsNotEmpty()
  @IsNumber()
  homeTeamId: number;

  @IsNotEmpty()
  @IsNumber()
  awayTeamId: number;
}
