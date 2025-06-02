import { IsIn, IsNumber, ValidateIf } from 'class-validator';

export class BatchUpdateGameDto {
  @ValidateIf((obj) => obj.homeScore !== null)
  @IsNumber()
  homeScore: number | null;

  @ValidateIf((obj) => obj.awayScore !== null)
  @IsNumber()
  awayScore: number | null;

  @ValidateIf((obj) => obj.status !== null)
  @IsIn(['경기전', '경기중', '경기종료'])
  status: string | null;
}
