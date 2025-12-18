import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GameDailyReqDto {
  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsNumber()
  month: number;

  @ApiProperty()
  @IsNumber()
  day: number;
}
