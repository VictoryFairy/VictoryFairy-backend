import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { plainToInstance } from 'class-transformer';
import { RankTopThreeResDto } from './dto/response/rank-top-three-res.dto';
import { RankListReqDto } from './dto/request/rank-list-req.dto';
import { RankNearbyResDto } from './dto/response/rank-nearby-res.dto';
import { RankResDto } from './dto/response/rank-res.dto';
import { RankApplicationQueryService } from './rank-application.query.service';

@ApiTags('rankings')
@Controller('rankings')
@JwtAuth('access')
export class RankController {
  constructor(
    private readonly rankApplicationQueryService: RankApplicationQueryService,
  ) {}

  @Get('top')
  @ApiOperation({
    summary: '랭킹 상위 3명',
    description:
      '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환. 데이터가 없으면 빈 배열 반환',
  })
  @ApiOkResponse({
    description: 'top 3명의 유저가 반환',
    type: RankTopThreeResDto,
  })
  async getRankTopThree(
    @Query() query: RankListReqDto,
  ): Promise<RankTopThreeResDto> {
    const teamId = query.teamId ? Number(query.teamId) : 'total';
    const topResult = await this.rankApplicationQueryService.getRankList(
      0,
      2,
      teamId,
    );

    return plainToInstance(RankTopThreeResDto, { top: topResult });
  }

  @Get('nearby')
  @ApiOperation({
    summary: '해당 유저와 주변의 2명 반환',
    description: '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 반환',
  })
  @ApiOkResponse({
    description:
      'nearBy 3명의 유저와 해당 유저의 데이터 반환. 단 1등이거나 꼴등이면 nearBy에서 2명이 반환 될 수 있음. 데이터가 없으면 빈 배열 반환',
    type: RankNearbyResDto,
  })
  async getNearByUser(
    @Query() query: RankListReqDto,
    @CurrentUser('id') userId: number,
  ): Promise<RankNearbyResDto | null> {
    const teamId = query.teamId ? Number(query.teamId) : 'total';
    const result =
      await this.rankApplicationQueryService.getUserNearByWithUserStats(
        userId,
        teamId,
      );
    return result;
  }

  @Get()
  @ApiOperation({
    summary: '랭킹 리스트 전부 가져오기',
    description:
      '쿼리에 teamId 추가하면 해당 팀에 대한 랭킹 리스트 전부를 반환. 데이터가 없으면 빈 배열 반환',
  })
  @ApiOkResponse({
    description: '배열 형태로 반환, ',
    type: [RankResDto],
  })
  async getRankList(@Query() query: RankListReqDto): Promise<RankResDto[]> {
    const teamId = query.teamId ? Number(query.teamId) : 'total';

    const result = await this.rankApplicationQueryService.getRankList(
      0,
      -1,
      teamId,
    );

    return result.map((rank) => plainToInstance(RankResDto, rank));
  }
}
