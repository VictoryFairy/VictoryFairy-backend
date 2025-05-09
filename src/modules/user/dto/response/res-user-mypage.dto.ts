import { ApiProperty } from '@nestjs/swagger';
import { UserMeResDto } from './res-user-me.dto';
import { ResRankRecordDto } from 'src/modules/rank/dto/response/res-rank-record.dto';

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
  record: ResRankRecordDto;

  constructor(userResDto: UserMeResDto, record: ResRankRecordDto) {
    this.user = userResDto;
    this.record = record;
  }
}
