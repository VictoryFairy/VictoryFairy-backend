import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRegisteredGameDto {
  @ApiProperty({
    description: '응원하는 팀의 ID',
    example: 4,
  })
  @IsNumber()
  cheeringTeamId: number;

  @ApiProperty({
    description: '좌석 상세',
    example: '115블록 2열 13번',
  })
  @IsString()
  seat: string;

  @ApiProperty({
    description: '감상평',
    example: '좋았다',
  })
  @IsString()
  review: string;

  @ApiProperty({
    description: 'S3에 등록되어 있는 직관 등록 경기 이미지로의 URL',
    example: 'http://example.com/url/to/image.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

