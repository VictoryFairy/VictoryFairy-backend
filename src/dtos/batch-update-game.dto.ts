import { IsIn, IsNumber } from 'class-validator';

export class BatchUpdateGameDto {
  @IsNumber()
  homeScore: number;

  @IsNumber()
  awayScore: number;

  @IsIn(['경기전', '경기중', '경기종료'])
  status: string;
}
