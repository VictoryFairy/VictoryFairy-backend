import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class EmailDto extends PickType(CreateUserDto, ['email'] as const) {}

export class NicknameDto extends PickType(CreateUserDto, [
  'nickname',
] as const) {}

export class EmailWithCodeDto extends PickType(CreateUserDto, ['email']) {
  @ApiProperty()
  @IsString()
  @Length(5, 5)
  code: string;
}
