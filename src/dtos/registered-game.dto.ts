import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class RegisteredGameDto {
  @ApiProperty({
    description: '등록 직관 경기 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '',
    example: 'http://example.com/url/to/image.jpg'
  })
  @IsString()
  @Expose()
  image: string;

  @ApiProperty({
    description: '좌석 상세',
    example: '115블록 2열 13번'
  })
  @IsString()
  @Expose()
  seat: string;

  @ApiProperty({
    description: '감상평',
    example: '좋았다'
  })
  @IsString()
  @Expose()
  review: string;

  @ApiProperty({
    description: '연결된 경기의 ID',
    example: '20240801SSLG0'
  })
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.game.id)
  gameId: string;

  @ApiProperty({
    description: '응원하는 팀의 ID',
    example: 4,
  })
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.cheering_team.id)
  cheeringTeamId: number;
}

export class CreateRegisteredGameDto extends OmitType(RegisteredGameDto, ['id'] as const) {}

export class UpdateRegisteredGameDto extends OmitType(PartialType(CreateRegisteredGameDto), ['gameId'] as const) {}

export class FindAllMonthlyQueryDto {
  @ApiProperty({
    description: '년도',
    example: 2024,
  })
  @IsNumber()
  year: number;

  @ApiProperty({
    description: '월',
    example: 8,
  })
  @IsNumber()
  month: number;
}
