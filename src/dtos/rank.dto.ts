import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
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
