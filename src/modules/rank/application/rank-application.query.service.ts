import { Injectable } from '@nestjs/common';
import { RankingRedisService } from 'src/modules/rank/core/ranking-redis.service';
import { UserRedisService } from 'src/modules/account/core/user-redis.service';
import { RankCoreService } from '../core/rank-core.service';
import { IRefinedRankData } from '../types/rank.type';
import { ResNearByDto } from '../dto/response/res-nearby.dto';
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
  ): Promise<IRefinedRankData[]> {
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
  ): Promise<ResNearByDto> {
    const userRank = await this.rankingRedisService.getUserRankByUserId(
      userId,
      teamId,
    );
    if (userRank === null) {
      return null;
    }
    const start = Math.max(userRank - 1, 0);
    const end = userRank + 1;
    const refinedRankData =
      await this.rankCoreService.getRefinedRankDataFromRedis(
        start,
        end,
        teamId,
      );
    const [nearBy, userStats] = await Promise.all([
      this.concatRankDataWithUserProfile(refinedRankData),
      this.rankCoreService.aggregateRankStatsByUserId(userId),
    ]);
    return plainToInstance(ResNearByDto, {
      nearBy,
      user: {
        userId: userId,
        totalGames: userStats.total.getTotalCount(),
        win: userStats.total.getWinCount(),
      },
    });
  }

  private async concatRankDataWithUserProfile(
    rankData: { rank: number; userId: number; score: number }[],
  ): Promise<IRefinedRankData[]> {
    const userIds = rankData.map((data) => data.userId);
    const userHashmap = await this.userRedisService.getUserInfoByIds(userIds);
    const rankDataWithUserProfile: IRefinedRankData[] = [];
    rankData.forEach(({ rank, score, userId }) => {
      const { nickname, profile_image } = userHashmap[userId.toString()];
      rankDataWithUserProfile.push({
        rank,
        score,
        user_id: userId,
        nickname,
        profile_image,
      });
    });
    return rankDataWithUserProfile;
  }
}
