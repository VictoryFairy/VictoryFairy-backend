import { Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { QueryTotalRankingListAboutTeamDto } from 'src/dtos/rank.dto';
import { UserDeco } from 'src/decorator/user.decorator';

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
  getRankList(@Query() query: QueryTotalRankingListAboutTeamDto) {
    const { teamId } = query;
    if (teamId) {
      return this.rankService.getRankList(teamId);
    }
    return this.rankService.getRankList();
  }

  @Get()
  @ApiOperation({
    summary: '랭킹 랜딩 페이지 랭킹 상위 3명, 해당 유저 포함 근처 유저 3명',
    description: '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환',
  })
  async getRankTopThree(
    @Query() query: QueryTotalRankingListAboutTeamDto,
    @UserDeco('id') userId: number,
  ) {
    const { teamId } = query;
    const [top, withUser] = await Promise.all([
      this.rankService.getTopThreeRankList(teamId),
      this.rankService.getUserRankWithNeighbors(userId, teamId),
    ]);
    return { top, withUser };
  }

  @Post()
  saveTest() {
    return this.rankService.saveTest();
  }
  @Get('test')
  rankUpdateTest() {
    return this.rankService.rankTodayUpdate();
  }

  @Delete()
  delTest() {
    return this.rankService.delTest();
  }
}
