import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/infra/redis/const/redis.const';
import { InjectRedisClient } from 'src/common/decorators/redis-inject.decorator';
import { RankScoreVo } from 'src/modules/rank/core/domain/vo/rank-score.vo';

@Injectable()
export class RankingRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  async updateRankings(
    userId: number,
    data: Record<string, RankScoreVo>,
  ): Promise<void> {
    const pipeline = this.redisClient.pipeline();
    for (const [key, vo] of Object.entries(data)) {
      const score = vo.getIntegerScoreForRedis();
      const userIdString = userId.toString();
      pipeline.zadd(`${RedisKeys.RANKING}:${key}`, score, userIdString);
    }
    await pipeline.exec();
  }

  async deleteRankByUserId(userId: number, teamIds: number[]): Promise<void> {
    const pipeline = this.redisClient.pipeline();
    pipeline.zrem(`${RedisKeys.RANKING}:total`, [userId]);
    teamIds.forEach((teamId) => {
      pipeline.zrem(`${RedisKeys.RANKING}:${teamId.toString()}`, [userId]);
    });
    await pipeline.exec();
  }

  async updateRankingScoreByUserId(userId: number, score: string, key: string) {
    try {
      await this.redisClient.zadd(
        `${RedisKeys.RANKING}:${key}`,
        score,
        `${userId}`,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Redis 랭킹 업데이트 실패 : ${userId} `,
      );
    }
  }

  async getUserRankByUserId(
    userId: number,
    teamId: number | 'total',
  ): Promise<number | null> {
    try {
      const userRank = await this.redisClient.zrevrank(
        `${RedisKeys.RANKING}:${teamId}`,
        userId.toString(),
      );
      return userRank;
    } catch (error) {
      throw new InternalServerErrorException(
        `Redis 랭킹 조회 실패 : ${userId}`,
      );
    }
  }

  async getRankingList(key: number | 'total', start: number, end: number) {
    try {
      const rankList = await this.redisClient.zrevrange(
        `${RedisKeys.RANKING}:${key}`,
        start,
        end,
        'WITHSCORES',
      );
      return rankList;
    } catch (error) {
      throw new InternalServerErrorException(`Redis 랭킹 조회 실패 : ${key}`);
    }
  }
}
