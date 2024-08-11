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
    description: '경기장 이름',
    example: '잠실'
  })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({
    description: '경기장 위도',
    example: 0,
  })
  @IsNumber()
  @Expose()
  latitude: number;

  @ApiProperty({
    description: '경기장 경도',
    example: 0,
  })
  @IsNumber()
  @Expose()
  longitude: number;

  @ApiProperty({
    description: '경기장 주소',
    example: 'no address',
  })
  @IsString()
  @Expose()
  address: string;
}
