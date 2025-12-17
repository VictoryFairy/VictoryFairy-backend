import { Injectable } from '@nestjs/common';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { UserRedisService } from 'src/modules/account/core/user-redis.service';
import { RankCoreService } from '../core/rank-core.service';
import {
  RefinedRankData,
  RefinedRankDataWithProfile,
} from '../core/types/rank.interface';
import {
  RankNearbyResDto,
  UserStatsResDto,
} from './dto/response/rank-nearby-res.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RankApplicationQueryService {
  constructor(
    private readonly userRedisService: UserRedisService,
    private readonly rankingRedisService: RankingRedisService,
    private readonly rankCoreService: RankCoreService,
  ) {}

  async getRankList(
    start: number,
    end: number,
    teamId: number | 'total',
  ): Promise<RefinedRankDataWithProfile[]> {
    const refinedRankData =
      await this.rankCoreService.getRefinedRankDataFromRedis(
        start,
        end,
        teamId,
      );

    const rankData = await this.concatRankDataWithUserProfile(refinedRankData);

    return rankData;
  }

  async getUserNearByWithUserStats(
    userId: number,
    teamId: number | 'total',
  ): Promise<RankNearbyResDto | null> {
    const [userRank, userStats] = await Promise.all([
      this.rankingRedisService.getUserRankByUserId(userId, teamId),
      this.rankCoreService.aggregateRankStatsByUserId(userId),
    ]);
    const userStatsDto: UserStatsResDto = {
      userId,
      totalGames: userStats.total.getTotalCount(),
      win: userStats.total.getWinCount(),
    };
    // 랭킹 없는 경우
    if (userRank === null) {
      return plainToInstance(RankNearbyResDto, {
        nearBy: [],
        user: userStatsDto,
      });
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const refinedRankData =
      await this.rankCoreService.getRefinedRankDataFromRedis(
        start,
        end,
        teamId,
      );
    const nearBy = await this.concatRankDataWithUserProfile(refinedRankData);
    return plainToInstance(RankNearbyResDto, {
      nearBy,
      user: userStatsDto,
    });
  }

  private async concatRankDataWithUserProfile(
    rankData: RefinedRankData[],
  ): Promise<RefinedRankDataWithProfile[]> {
    const userIds = rankData.map((data) => data.userId);
    const userHashmap = await this.userRedisService.getUserInfoByIds(userIds);
    const rankDataWithUserProfile: RefinedRankDataWithProfile[] = [];
    rankData.forEach(({ rank, score, userId }) => {
      const { nickname, profile_image } = userHashmap[userId.toString()];
      rankDataWithUserProfile.push({
        rank,
        score,
        userId,
        nickname,
        profileImage: profile_image,
      });
    });
    return rankDataWithUserProfile;
  }
}
