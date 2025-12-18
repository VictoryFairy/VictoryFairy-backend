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
import { GameResDto } from 'src/modules/game/application/dto/response/game-res.dto';

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
  @Type(() => GameResDto)
  game: GameResDto;

  @IsNotEmpty()
  @Expose({ name: 'cheering_team' })
  @Type(() => TeamDto)
  cheeringTeam: TeamDto;
}
