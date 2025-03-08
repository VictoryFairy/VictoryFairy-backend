import { InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';

export class RankingRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

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

  async getUserRank(userId: number, teamId?: number): Promise<number | null> {
    const key = teamId ? teamId : 'total';
    const userRank = await this.redisClient.zrevrank(
      `${RedisKeys.RANKING}:${key}`,
      userId.toString(),
    );
    return userRank;
  }

  async getRankingList(key: number | 'total', start: number, end: number) {
    const rankList = await this.redisClient.zrevrange(
      `${RedisKeys.RANKING}:${key}`,
      start,
      end,
      'WITHSCORES',
    );
    return rankList;
  }
}
