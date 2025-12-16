import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { CODE_LENGTH } from 'src/modules/auth/const/auth.const';

export class EmailDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}

export class EmailWithCodeDto extends EmailDto {
  @IsString()
  @Length(CODE_LENGTH, CODE_LENGTH)
  code: string;
}
