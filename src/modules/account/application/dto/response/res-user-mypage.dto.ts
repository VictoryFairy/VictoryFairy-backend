import { ApiProperty } from '@nestjs/swagger';
import { UserMeResDto } from './res-user-me.dto';
import { RankRecordResDto } from 'src/modules/rank/application/dto/response/rank-record-res.dto';

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
  record: RankRecordResDto;

  constructor(userResDto: UserMeResDto, record: RankRecordResDto) {
    this.user = userResDto;
    this.record = record;
  }
}
