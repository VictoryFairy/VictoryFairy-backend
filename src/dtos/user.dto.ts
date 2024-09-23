import { ApiProperty, PickType, OmitType } from '@nestjs/swagger';
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
import { UserRecordDto } from './rank.dto';

export class BaseUserDto {
  @ApiProperty({
    example: 1,
  })
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 'example@example.com',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'nickanme example',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  nickname: string;

  @ApiProperty({
    example: 'url/to/example/image',
  })
  @Expose()
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiProperty({
    example: 1,
  })
  @Expose()
  @IsNotEmpty()
  @IsNumber()
  teamId: number;
}

export class CreateUserDto extends OmitType(BaseUserDto, ['id']) {
  @ApiProperty({
    example: 'should be hidden',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsString()
  image: string;

  @IsString()
  nickname: string;
}

export class LoginUserDto extends PickType(BaseUserDto, ['email']) {
  @ApiProperty({
    example: 'should be hidden',
  })
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

  static getExample() {
    return {
      updateNickname: {
        summary: 'Nickname 업데이트 예제',
        value: {
          field: 'nickname',
          value: 'evans',
        },
      },
      updateImage: {
        summary: 'Image 업데이트 예제',
        value: {
          field: 'image',
          value: 'http://example.com/image.jpg',
        },
      },
      updateTeamId: {
        summary: 'Team ID 업데이트 예제',
        value: {
          field: 'teamId',
          value: 1,
        },
      },
    };
  }
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
export class UserResDto extends PickType(BaseUserDto, [
  'id',
  'email',
  'image',
  'nickname',
]) {
  @ApiProperty()
  @Expose()
  @IsString()
  @Transform(({ obj }) => obj.profile_image ?? obj.image)
  image: string;
}

export class UserMyPageDto {
  @ApiProperty({
    example: {
      id: 12,
      email: 'test11@gmail.com',
      nickname: 'test11',
      image: 'dfdadlkjfk/example',
    },
  })
  user: UserResDto;

  @ApiProperty()
  record: UserRecordDto;
}

export class ResCheckPwDto {
  @ApiProperty()
  isCorrect: boolean;

  static getExamples() {
    return {
      incorrect: {
        summary: '비밀번호 불일치',
        value: { isCorrect: false },
      },
      correct: {
        summary: '비밀번호 일치',
        value: { isCorrect: true },
      },
    };
  }
}
