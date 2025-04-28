import { ApiProperty } from '@nestjs/swagger';
import { ResRankDto } from './res-rank.dto';
import { Type } from 'class-transformer';
class UserStatsDto {
  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ example: 8 })
  totalGames: number;

  @ApiProperty({ example: 6 })
  win: number;
}

export class ResNearByDto {
  @ApiProperty({
    type: ResRankDto,
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
  @Type(() => ResRankDto)
  nearBy: ResRankDto[];

  @ApiProperty({
    type: UserStatsDto,
    example: { userId: 2, totalGames: 8, win: 6 },
  })
  user: UserStatsDto;
}
