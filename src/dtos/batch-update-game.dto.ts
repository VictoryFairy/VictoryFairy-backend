import { IsIn, IsNumber, IsString } from 'class-validator';

export class BatchUpdateGameDto {
  @IsNumber()
  homeScore: number;

  @IsNumber()
  awayScore: number;

  @IsString()
  status: string | null;
}
