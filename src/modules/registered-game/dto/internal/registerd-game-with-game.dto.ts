import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { RegisteredGameStatus } from '../../types/registered-game-status.type';
import { TeamDto } from 'src/modules/team/dto/response/res-team.dto';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Game } from 'src/modules/game/entities/game.entity';

export class RegisteredGameWithGameDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNotEmpty()
  @IsString()
  seat: string;

  @IsNotEmpty()
  @IsString()
  review: string;

  @IsOptional()
  @IsEnum(RegisteredGameStatus)
  status?: RegisteredGameStatus;

  @IsNotEmpty()
  @Type(() => Game)
  game: Game;

  @IsNotEmpty()
  @Type(() => TeamDto)
  cheering_team: TeamDto;
}
