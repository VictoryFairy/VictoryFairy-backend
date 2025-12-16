import { ApiProperty } from '@nestjs/swagger';
import { RankResDto } from './rank-res.dto';
import { Type } from 'class-transformer';

class UserStatsResDto {
  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ example: 8 })
  totalGames: number;

  @ApiProperty({ example: 6 })
  win: number;
}

export class RankNearbyResDto {
  @ApiProperty({
    type: RankResDto,
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
    ],
  })
  @Type(() => RankResDto)
  nearBy: RankResDto[];

  @ApiProperty({
    type: UserStatsResDto,
    example: { userId: 2, totalGames: 8, win: 6 },
  })
  user: UserStatsResDto;
}

