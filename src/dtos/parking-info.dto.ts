import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { StadiumDto } from './stadium.dto';

@Exclude()
export class ParkingInfoDto {
  @ApiProperty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  name: string;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  is_free: boolean;

  @ApiProperty()
  @IsNumber()
  @Expose()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Expose()
  longitude: number;

  @ApiProperty()
  @IsString()
  @Expose()
  address: string;

  @ApiProperty()
  @Expose()
  stadium: StadiumDto;
}
