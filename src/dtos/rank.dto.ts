import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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
