import { ApiProperty } from '@nestjs/swagger';
import { UserMeResDto } from './res-user-me.dto';
import { UserRecordDto } from 'src/modules/rank/dto/rank.dto';

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
