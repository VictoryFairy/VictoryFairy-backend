import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRegisteredGameDto {
  @ApiProperty({
    description: 'S3에 등록되어 있는 직관 등록 경기 이미지로의 URL',
    example: 'http://example.com/url/to/image.jpg',
  })
  @IsString()
  @IsOptional()
  @Expose()
  image?: string;

  @ApiProperty({
    description: '좌석 상세',
    example: '115블록 2열 13번',
  })
  @IsString()
  @Expose()
  seat: string;

  @ApiProperty({
    description: '감상평',
    example: '좋았다',
  })
  @IsString()
  @Expose()
  review: string;

  @ApiProperty({
    description: '연결된 경기의 ID',
    example: '20240801SSLG0',
  })
  @IsNotEmpty()
  @IsString()
  @Expose()
  gameId: string;

  @ApiProperty({
    description: '응원하는 팀의 ID',
    example: 4,
  })
  @IsNotEmpty()
  @IsNumber()
  @Expose()
  cheeringTeamId: number;
}

