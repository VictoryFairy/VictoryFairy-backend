import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TeamDto } from 'src/modules/team/dto/response/res-team.dto';
import { BaseInternalDto } from 'src/shared/dto/base-internal.dto';
import { RegisteredGameStatus } from '../../types/registered-game-status.type';

export class UpdateRegisteredGameToEntityDto extends BaseInternalDto {
  @IsOptional()
  image?: string | null;

  @IsString()
  seat: string;

  @IsString()
  review: string;

  @Type(() => TeamDto)
  cheeringTeam: TeamDto;

  @IsOptional()
  @IsEnum(RegisteredGameStatus)
  status?: RegisteredGameStatus;
}
