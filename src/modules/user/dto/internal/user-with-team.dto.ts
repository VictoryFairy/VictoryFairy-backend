import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dtos/base-internal.dto';
import { TeamDto } from 'src/modules/team/dto/response/res-team.dto';

export class UserWithTeamDto extends BaseInternalDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  nickname: string;

  @IsNotEmpty()
  @IsString()
  profile_image: string;

  @IsNotEmpty()
  @Type(() => TeamDto)
  support_team: TeamDto;
}
