import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { StadiumDto } from './stadium.dto';

@Exclude()
export class ParkingInfoDto {
  @ApiProperty({
    description: '주차장 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '주차장 이름',
    example: 'no name',
  })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({
    description: '무료 여부',
    example: false,
  })
  @IsBoolean()
  @Expose()
  is_free: boolean;

  @ApiProperty({
    description: '주차장 위도',
    example: 0,
  })
  @IsNumber()
  @Expose()
  latitude: number;

  @ApiProperty({
    description: '주차장 경도',
    example: 0,
  })
  @IsNumber()
  @Expose()
  longitude: number;

  @ApiProperty({
    description: '주차장 주소',
    example: 'no address'
  })
  @IsString()
  @Expose()
  address: string;

  @ApiProperty()
  @Expose()
  stadium: StadiumDto;
}
