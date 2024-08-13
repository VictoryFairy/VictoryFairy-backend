import { OmitType } from '@nestjs/swagger';
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
