import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { CODE_LENGTH } from 'src/const/auth.const';

export class EmailWithCodeDto extends PickType(CreateUserDto, [
  'email',
] as const) {
  @ApiProperty()
  @IsString()
  @Length(CODE_LENGTH, CODE_LENGTH)
  code: string;
}
