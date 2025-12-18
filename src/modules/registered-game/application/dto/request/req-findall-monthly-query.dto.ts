import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class FindAllMonthlyQueryDto {
  @ApiProperty({
    description: '년도',
    example: 2024,
  })
  @IsNumber()
  year: number;

  @ApiProperty({
    description: '월',
    example: 8,
  })
  @IsNumber()
  month: number;
}

