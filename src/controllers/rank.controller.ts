import { Controller, Get, Query } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import {
  QueryTotalRankingListAboutTeamDto,
  ResNearByDto,
  ResRankDto,
  ResRankTopThreeDto,
} from 'src/dtos/rank.dto';
import { UserDeco } from 'src/decorator/user.decorator';
import { plainToInstance } from 'class-transformer';

@ApiTags('rankings')
@Controller('rankings')
@JwtAuth('access')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get('top')
  @ApiOperation({
    summary: '랭킹 상위 3명',
    description:
      '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환. 데이터가 없으면 빈 배열 반환',
  })
  @ApiOkResponse({
    description: 'top 3명의 유저가 반환',
    type: ResRankTopThreeDto,
  })
  async getRankTopThree(@Query() query: QueryTotalRankingListAboutTeamDto) {
    const { teamId } = query;
    const topResult = await this.rankService.getTopThreeRankList(teamId);

    const top = plainToInstance(ResRankTopThreeDto, topResult);
    return { top };
  }

  @Get('nearby')
  @ApiOperation({
    summary: '해당 유저와 주변의 2명 반환',
    description: '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환',
  })
  @ApiOkResponse({
    description:
      'nearBy 3명의 유저와 해당 유저의 데이터 반환. 단 1등이거나 꼴등이면 nearBy에서 2명이 반환 될 수 있음. 데이터가 없으면 빈 배열 반환',
    type: ResNearByDto,
  })
  async getNearByUser(
    @Query() query: QueryTotalRankingListAboutTeamDto,
    @UserDeco('id') userId: number,
  ) {
    const { teamId } = query;
    const [nearBy, userStats] = await Promise.all([
      this.rankService.getUserRankWithNeighbors(userId, teamId),
      this.rankService.userOverallGameStats(userId),
    ]);
    return {
      nearBy,
      user: { userId, totalGames: userStats.total, win: userStats.win },
    };
  }

  @Get()
  @ApiOperation({
    summary: '랭킹 리스트 전부 가져오기',
    description:
      '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 전부를 반환. 데이터가 없으면 빈 배열 반환',
  })
  @ApiOkResponse({
    description: '배열 형태로 반환, ',
    type: [ResRankDto],
  })
  async getRankList(@Query() query: QueryTotalRankingListAboutTeamDto) {
    const { teamId } = query;

    const result = await this.rankService.getRankList(teamId);

    return result.map((rank) => plainToInstance(ResRankDto, rank));
  }
}
