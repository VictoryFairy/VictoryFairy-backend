import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';

export class CreateRankDto {
  team_id: number;
  user_id: number;
  status: TRegisteredGameStatus;
  year: number;
}

export class EventCreateRankDto extends OmitType(CreateRankDto, [
  'year',
] as const) {}

export class QueryTotalRankingListAboutTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  teamId?: number;
}

export class UserRecordDto {
  @ApiProperty({ example: 1 })
  win: number;

  @ApiProperty({ example: 0 })
  lose: number;

  @ApiProperty({ example: 0 })
  tie: number;

  @ApiProperty({ example: 0 })
  cancel: number;

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1005 })
  score: number;
}

export class OppTeamDto {
  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  win: number;
}

export class OverallOppTeamDto {
  @ApiProperty({ example: 5 })
  totalWin: number;

  @ApiProperty({ example: 3 })
  homeWin: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        win: { type: 'number' },
      },
    },
    example: {
      '2': { total: 1, win: 1 },
      '5': { total: 1, win: 1 },
    },
  })
  oppTeam: Record<string, OppTeamDto>;
}

@Exclude()
export class ResRankDto {
  @ApiProperty({ example: 1 })
  @Expose()
  rank: number;

  @ApiProperty({ example: 1025 })
  @Expose()
  score: number;

  @ApiProperty({ example: 'imagefadfafa' })
  @Expose()
  @Transform(({ obj }) => obj.profile_image ?? obj.image)
  image: string;

  @ApiProperty({ example: 'test1' })
  @Expose()
  nickname: string;

  @ApiProperty({ example: 2 })
  @Expose()
  @Transform(({ obj }) => obj.user_id ?? obj.userId)
  userId: number;
}

export class ResRankTopThreeDto {
  @ApiProperty({
    type: [ResRankDto],
    example: [
      {
        rank: 1,
        score: 1025,
        image: 'imagefadfafa',
        nickname: 'test1',
        userId: 2,
      },
      {
        rank: 2,
        score: 1020,
        image: 'imagefadfafa',
        nickname: 'test4',
        userId: 5,
      },
      {
        rank: 3,
        score: 1010,
        image: 'imagefadfafa',
        nickname: 'test10',
        userId: 11,
      },
    ],
  })
  @Type(() => ResRankDto)
  top: ResRankDto[];
}

class UserStatsDto {
  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ example: 8 })
  totalGames: number;

  @ApiProperty({ example: 6 })
  win: number;
}

export class ResNearByDto {
  @ApiProperty({
    type: ResRankDto,
    example: [
      {
        rank: 1,
        score: 1025,
        image: 'imagefadfafa',
        nickname: 'test1',
        userId: 2,
      },
      {
        rank: 2,
        score: 1020,
        image: 'imagefadfafa',
        nickname: 'test4',
        userId: 5,
      },
    ],
  })
  @Type(() => ResRankDto)
  nearBy: ResRankDto[];

  @ApiProperty({
    type: UserStatsDto,
    example: { userId: 2, totalGames: 8, win: 6 },
  })
  user: UserStatsDto;
}
