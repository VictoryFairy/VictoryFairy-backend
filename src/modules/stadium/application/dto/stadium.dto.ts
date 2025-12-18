import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
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
  @Transform(({ obj }) => {
    if (obj.name === '대전(신)') return '대전'; // 새로운 대전 구장 이름 그대로 대전으로 하도록 수정
    return obj.name;
  })
  name: string;

  @ApiProperty({
    description: '경기장 풀네임',
    example: '잠실종합운동장잠실야구장',
  })
  @IsString()
  @Transform(({ obj }) => obj.full_name)
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
