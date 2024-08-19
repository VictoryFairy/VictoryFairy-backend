import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class StadiumDto {
  @ApiProperty({
    description: '경기장 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '간단한 경기장 이름',
    example: '잠실',
  })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({
    description: '경기장 풀네임',
    example: '잠실종합운동장잠실야구장',
  })
  @IsString()
  @Expose()
  fullName: string;

  @ApiProperty({
    description: '경기장 위도',
    example: 37.511985800000055,
  })
  @IsNumber()
  @Expose()
  latitude: number;

  @ApiProperty({
    description: '경기장 경도',
    example: 127.0676545539383,
  })
  @IsNumber()
  @Expose()
  longitude: number;
}
