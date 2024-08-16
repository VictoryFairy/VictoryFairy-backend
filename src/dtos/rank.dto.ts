import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { TRegisteredGameStatus } from 'src/types/registered-game-status.type';

export class CreateRankDto {
  team_id: number;
  user_id: number;
  status: TRegisteredGameStatus;
  thisYear: number;
}

export class EventCreateRankDto extends OmitType(CreateRankDto, [
  'thisYear',
] as const) {}

export class QueryTotalRankingListAboutTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  teamId?: number;
}

export class UserRecordDto {
  @ApiProperty()
  win: number;

  @ApiProperty()
  lose: number;

  @ApiProperty()
  tie: number;

  @ApiProperty()
  cancel: number;

  @ApiProperty()
  total: number;
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
