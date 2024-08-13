import { Controller, Get, Query } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { QueryTotalRankingListAboutTeamDto } from 'src/dtos/rank.dto';

@ApiTags('Rank')
@Controller('ranks')
@JwtAuth('access')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get()
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
}
