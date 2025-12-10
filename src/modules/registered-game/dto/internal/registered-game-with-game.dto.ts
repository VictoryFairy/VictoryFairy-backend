import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { RegisteredGameStatus } from '../../types/registered-game-status.type';
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

export class RegisteredGameWithGameDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  seat: string;

  @IsString()
  review: string;

  @IsOptional()
  @IsEnum(RegisteredGameStatus)
  status?: RegisteredGameStatus;

  @IsNotEmpty()
  @Type(() => GameDto)
  game: GameDto;

  @IsNotEmpty()
  @Expose({ name: 'cheering_team' })
  @Type(() => TeamDto)
  cheeringTeam: TeamDto;
}
