import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';
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
    example: '데이터뱅크 주차장',
  })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({
    description: '주차장 위도',
    example: 35.83883,
  })
  @IsNumber()
  @Expose()
  latitude: number;

  @ApiProperty({
    description: '주차장 경도',
    example: 128.68388,
  })
  @IsNumber()
  @Expose()
  longitude: number;

  @ApiProperty({
    description: '주차장 주소',
    example: '대구 수성구 알파시티1로 232',
  })
  @IsString()
  @Expose()
  address: string;

  @ApiProperty({
    description: '주차장 링크',
    example: 'https://map.naver.com/p/search/대구 수성구 알파시티1로 232/address/14325037.4645611,4278472.6954563,대구광역시 수성구 알파시티1로 232,new?c=19.00,0,0,0,dh&isCorrectAnswer=true',
  })
  @IsUrl()
  @Expose()
  link: string;

  @ApiProperty()
  @Expose()
  stadium: StadiumDto;
}
