import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class StadiumDto {
  @ApiProperty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  name: string;

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
}
