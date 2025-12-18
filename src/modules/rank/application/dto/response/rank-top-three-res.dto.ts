import { Type } from 'class-transformer';
import { RankResDto } from './rank-res.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RankTopThreeResDto {
  @ApiProperty({
    type: [RankResDto],
    example: [
      {
        rank: 1,
        score: 1025,
        image: 'imagefadfafa',
        nickname: 'test1',
        userId: 2,
      },
      {
        rank: 2,
        score: 1020,
        image: 'imagefadfafa',
        nickname: 'test4',
        userId: 5,
      },
      {
        rank: 3,
        score: 1010,
        image: 'imagefadfafa',
        nickname: 'test10',
        userId: 11,
      },
    ],
  })
  @Type(() => RankResDto)
  top: RankResDto[];
}

