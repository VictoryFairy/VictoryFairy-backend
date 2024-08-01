import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UserProfileDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password']),
) {
  @ApiPropertyOptional()
  image?: string;

  @ApiPropertyOptional()
  nickname?: string;

  @ApiPropertyOptional()
  teamId?: number;
}
