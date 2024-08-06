import {
  ApiProperty,
  PickType,
  OmitType,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { CODE_LENGTH } from 'src/const/auth.const';

export class BaseUserDto {
  @ApiProperty()
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @Expose()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @Expose()
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @ApiProperty()
  @Expose()
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiProperty()
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  teamId: number;
}

export class CreateUserDto extends OmitType(BaseUserDto, ['id']) {
  @ApiProperty()
  @IsString()
  password: string;
}

export class LoginUserDto extends PickType(BaseUserDto, ['email']) {
  @ApiProperty()
  @IsString()
  password: string;
}

export class EmailDto extends PickType(BaseUserDto, ['email'] as const) {}

export class NicknameDto extends PickType(BaseUserDto, ['nickname'] as const) {}

export class PatchUserProfileDto {
  @ApiProperty({
    description: '업데이트할 필드 (nickname, image, teamId 중 하나)',
  })
  @IsNotEmpty()
  @IsIn(['nickname', 'image', 'teamId'])
  @IsString()
  field: 'nickname' | 'image' | 'teamId';

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ obj }) =>
    obj.field === 'teamId' ? parseFloat(obj.value) : obj.value,
  )
  @ValidateIf((obj) => obj.field === 'teamId')
  @IsNumber()
  @ValidateIf((obj) => obj.field !== 'teamId')
  @IsString()
  value: any;
}

export class EmailWithCodeDto extends PickType(BaseUserDto, [
  'email',
] as const) {
  @ApiProperty()
  @IsString()
  @Length(CODE_LENGTH, CODE_LENGTH)
  code: string;
}

@Exclude()
export class UserDetailDto extends PickType(BaseUserDto, [
  'email',
  'image',
  'nickname',
]) {
  @ApiProperty()
  @Expose()
  @IsNumber()
  score: number;

  @ApiPropertyOptional({ type: [Number] })
  @Expose()
  @Transform(({ obj }) => {
    return obj.registeredGames?.map((game) => game.id);
  })
  registeredGames?: number[];

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.support_team?.name)
  supportTeam?: string;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ obj }) => obj.support_team?.id)
  supportTeamId?: number;
}
