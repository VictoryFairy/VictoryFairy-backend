import { Controller, Get, Query } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import {
  QueryTotalRankingListAboutTeamDto,
  ResRankDto,
} from 'src/dtos/rank.dto';
import { UserDeco } from 'src/decorator/user.decorator';
import { plainToInstance } from 'class-transformer';

@ApiTags('rankings')
@Controller('rankings')
@JwtAuth('access')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get('list')
  @ApiOperation({
    summary: '랭킹 리스트 전부 가져오기',
    description:
      '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 전부를 반환',
  })
  @ApiOkResponse({
    description: '배열 형태로 보여주고 랭킹 순위는 rank 프로퍼티의 값',
    example: [
      {
        rank: 1,
        score: 1030,
        profile_image: 'image/s3/example',
        nickname: 'test5',
        user_id: 1,
      },
    ],
  })
  async getRankList(@Query() query: QueryTotalRankingListAboutTeamDto) {
    const { teamId } = query;

    const result = teamId
      ? await this.rankService.getRankList(teamId)
      : await this.rankService.getRankList();

    return result.map((rank) => plainToInstance(ResRankDto, rank));
  }

  @Get()
  @ApiOperation({
    summary: '랭킹 상위 3명과 해당 유저 주변의 3명을 표시',
    description: '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환',
  })
  @ApiOkResponse({
    description:
      'top, withUser 각각 3명의 유저가 반환. 단 1등이거나 꼴등이면 withUser에서 2명이 반환 될 수 있음.',
    schema: {
      example: {
        top: [
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
        withUser: [
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
        user: {
          userId: 2,
          totalGame: 8,
          win: 6,
        },
      },
    },
  })
  async getRankTopThree(
    @Query() query: QueryTotalRankingListAboutTeamDto,
    @UserDeco('id') userId: number,
  ) {
    const { teamId } = query;
    const [topResult, withUserResult, userStat] = await Promise.all([
      this.rankService.getTopThreeRankList(teamId),
      this.rankService.getUserRankWithNeighbors(userId, teamId),
      this.rankService.userOverallGameStats(userId),
    ]);
    const top = topResult.map((rank) => plainToInstance(ResRankDto, rank));
    const withUser = withUserResult.map((rank) =>
      plainToInstance(ResRankDto, rank),
    );

    return {
      top,
      withUser,
      user: { userId, totalGame: userStat.total, win: userStat.win },
    };
  }
}
