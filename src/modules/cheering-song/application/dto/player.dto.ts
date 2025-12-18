import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class PlayerDto {
  @ApiProperty({
    description: '선수 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '선수 이름',
    example: 1,
  })
  @IsString()
  @Expose()
  name: number;

  @ApiProperty({
    description: '선수 등번호',
    example: 7,
  })
  @IsNumber()
  @Expose()
  @Transform(({ obj }) => obj.jersey_number)
  jerseyNumber: number;
}
