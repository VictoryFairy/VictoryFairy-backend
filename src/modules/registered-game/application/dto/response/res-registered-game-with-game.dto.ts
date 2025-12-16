import { RegisteredGameStatus } from '../../../core/types/registered-game-status.type';
import { TeamDto } from 'src/modules/team/application/dto/response/res-team.dto';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { GameDto } from 'src/modules/game/dto/game.dto';

export class RegisteredGameWithGameResponseDto {
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @Expose()
  @IsOptional()
  @IsString()
  image?: string;

  @Expose()
  @IsString()
  seat: string;

  @Expose()
  @IsString()
  review: string;

  @Expose()
  @IsOptional()
  @IsEnum(RegisteredGameStatus)
  status?: RegisteredGameStatus;

  @Expose()
  @IsNotEmpty()
  @Type(() => GameDto)
  game: GameDto;

  @Expose({ name: 'cheering_team' })
  @IsNotEmpty()
  @Type(() => TeamDto)
  cheeringTeam: TeamDto;
}
