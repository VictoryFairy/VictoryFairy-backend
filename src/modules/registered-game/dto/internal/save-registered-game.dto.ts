import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GameDto } from 'src/modules/game/dto/game.dto';
import { TeamDto } from 'src/modules/team/dto/response/res-team.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { RegisteredGameStatus } from '../../types/registered-game-status.type';

export class SaveRegisteredGameDto extends BaseInternalDto {
  @IsOptional()
  @IsString()
  image: string | null;

  @IsString()
  seat: string;

  @IsIn([...Object.values(RegisteredGameStatus), null])
  status: RegisteredGameStatus | null;

  @IsString()
  review: string;

  @IsNotEmpty()
  @Type(() => GameDto)
  game: GameDto;

  @IsNotEmpty()
  @Type(() => TeamDto)
  cheeringTeam: TeamDto;

  @IsNotEmpty()
  @Type(() => User)
  user: User;
}
