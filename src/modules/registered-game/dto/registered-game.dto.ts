import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TRegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';
import { GameDto } from '../../game/dto/game.dto';
import { TeamDto } from '../../team/dto/team.dto';

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

  @ApiProperty()
  @IsString()
  @Expose()
  status?: TRegisteredGameStatus;

  @ApiProperty({
    description: '연결된 경기의 정보',
  })
  @Expose()
  @Type(() => GameDto)
  @ValidateNested()
  game: GameDto;

  @ApiProperty({
    description: '응원하는 팀의 정보',
    example: {
      id: 4,
      name: '삼성',
    },
  })
  @Expose()
  @Transform(({ obj }) => obj.cheering_team)
  cheeringTeam: TeamDto;
}

export class CreateRegisteredGameDto extends OmitType(RegisteredGameDto, [
  'id',
  'status',
  'game',
  'cheeringTeam',
] as const) {
  @ApiProperty({
    description: '연결된 경기의 ID',
    example: '20240801SSLG0',
  })
  @IsString()
  @Expose()
  gameId: string;

  @ApiProperty({
    description: '응원하는 팀의 ID',
    example: 4,
  })
  @IsNumber()
  @Expose()
  cheeringTeamId: number;
}

export class UpdateRegisteredGameDto extends PartialType(
  OmitType(CreateRegisteredGameDto, ['gameId'] as const),
) {}

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
