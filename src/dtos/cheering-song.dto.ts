import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

@Exclude()
export class CheeringSongDto {
  @ApiProperty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  title: string;

  @ApiProperty()
  @IsString()
  @Expose()
  lyric: string;

  @ApiProperty()
  @IsUrl()
  @Expose()
  link: string;
}
