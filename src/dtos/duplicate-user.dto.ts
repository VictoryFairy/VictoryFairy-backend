import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class EmailDto extends PickType(CreateUserDto, ['email'] as const) {}

export class NicknameDto extends PickType(CreateUserDto, [
  'nickname',
] as const) {}
