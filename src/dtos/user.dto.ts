import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { CODE_LENGTH, SocialProvider } from 'src/const/auth.const';
import { UserRecordDto } from './rank.dto';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { User } from 'src/entities/user.entity';

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

export class CreateLocalUserDto {
  @ApiProperty({
    example: 'test@test.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

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

  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  teamId: number;
}

export class LoginLocalUserDto extends PickType(BaseUserDto, ['email']) {
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

export class UserMeResDto {
  id: number;
  email: string;
  nickname: string;
  image: string;
  provider: SocialProvider[];
  primaryProvider: SocialProvider | null;

  constructor(user: User, socialAuths: SocialAuth[]) {
    this.id = user.id;
    this.email = user.email;
    this.nickname = user.nickname;
    this.image = user.profile_image;
    this.provider = socialAuths.map((socialAuth) => socialAuth.provider);
    this.primaryProvider =
      socialAuths.find((socialAuth) => socialAuth.is_primary === true)
        ?.provider || null;
  }
}

export class UserMyPageDto {
  @ApiProperty({
    example: {
      id: 12,
      email: 'test11@gmail.com',
      nickname: 'test11',
      image: 'dfdadlkjfk/example',
      provider: ['google', 'kakao'],
      primaryProvider: 'google',
    },
  })
  user: UserMeResDto;

  @ApiProperty()
  record: UserRecordDto;

  constructor(userResDto: UserMeResDto, record: UserRecordDto) {
    this.user = userResDto;
    this.record = record;
  }
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

export class TermAgreeDto {
  @ApiProperty({
    type: [String],
    description: '동의할 약관 ID 목록',
    example: ['PRIVACY20250304', 'LOCATION20250302'],
  })
  @IsNotEmpty()
  @ArrayNotEmpty()
  @IsString({ each: true })
  termIds: string[];
}

export class UserWithSupportTeamDto {
  id: number;
  email: string;
  nickname: string;
  support_team: {
    id: number;
    name: string;
  };
}
