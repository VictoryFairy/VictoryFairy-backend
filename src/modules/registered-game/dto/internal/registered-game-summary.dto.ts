import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';
import { RegisteredGameStatus } from '../../types/registered-game-status.type';

export class RegisteredGameSummaryDto {
  @IsNotEmpty()
  @IsNumber()
  team_id: number;
  @IsNotEmpty()
  @IsNumber()
  user_id: number;
  @IsNotEmpty()
  @IsIn(Object.values(RegisteredGameStatus))
  status: RegisteredGameStatus;

  @IsNotEmpty()
  @IsNumber()
  year: number;
}
