import { IsIn, IsNumber } from 'class-validator';

export class BatchUpdateGameDto {
  @IsNumber()
  homeScore: number | null;

  @IsNumber()
  awayScore: number | null;

  @IsIn(['경기전', '경기중', '경기종료'])
  status: string;
}
