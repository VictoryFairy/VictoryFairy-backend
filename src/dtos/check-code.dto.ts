import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class EmailWithCodeDto extends PickType(CreateUserDto, [
  'email',
] as const) {
  @ApiProperty()
  @IsString()
  @Length(5, 5)
  code: string;
}
