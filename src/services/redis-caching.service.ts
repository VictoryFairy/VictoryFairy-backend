import { InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';
import { CODE_LIMIT_TIME } from 'src/const/auth.const';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';

export class RedisCachingService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  async cachingVerificationCode(email: string, code: string) {
    try {
      await this.redisClient.set(
        `${RedisKeys.EMAIL_CODE}:${email}`,
        code,
        'EX',
        CODE_LIMIT_TIME,
      );
    } catch (error) {
      throw new InternalServerErrorException('레디스 저장 실패');
    }
  }

  async getCachedVerificationCode(email: string) {
    const getCachedCode = await this.redisClient.get(
      `${RedisKeys.EMAIL_CODE}:${email}`,
    );
    return getCachedCode;
  }

  async deleteVerificationCode(email: string) {
    try {
      await this.redisClient.del(`${RedisKeys.EMAIL_CODE}:${email}`);
    } catch (error) {
      throw new InternalServerErrorException('레디스 삭제 실패');
    }
  }

  async saveUser(user: User) {
    const { id, nickname, profile_image } = user;
    const userInfo = { id, nickname, profile_image };
    try {
      const cached = await this.redisClient.hset(
        RedisKeys.USER_INFO,
        userInfo.id.toString(),
        JSON.stringify(userInfo),
      );
      return cached;
    } catch (error) {
      throw new InternalServerErrorException('Redis userInfo 캐싱 실패');
    }
  }

  async getUserList() {
    try {
      const userInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
      const cachedUsers = Object.entries(userInfo).reduce(
        (acc, [id, userInfoString]) => {
          acc[parseInt(id)] = JSON.parse(userInfoString);
          return acc;
        },
        {},
      );
      return cachedUsers;
    } catch (error) {
      throw new InternalServerErrorException('캐싱 유저 읽기 실패');
    }
  }
  async userSynchronizationTransaction(userId: number, teams: Team[]) {
    const redisTransaction = this.redisClient.multi();
    // redis caching 동기화
    redisTransaction.hdel(RedisKeys.USER_INFO, userId.toString());
    redisTransaction.zrem(`${RedisKeys.RANKING}:total`, [userId]);
    for (const team of teams) {
      redisTransaction.zrem(`${RedisKeys.RANKING}:${team.id}`, [userId]);
    }
    const redisExecResult = await redisTransaction.exec();
    if (!redisExecResult) {
      throw new InternalServerErrorException('Redis 캐시 동기화 실패');
    }
  }

  async getUserInfo() {
    const rawUserInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
    const parsedInfo = {};
    Object.values(rawUserInfo).forEach((user) => {
      const obj = JSON.parse(user);
      parsedInfo[obj.id] = obj;
    });
    return parsedInfo;
  }

  async updateRankingScoreByUserId(userId: number, score: string, key: string) {
    try {
      await this.redisClient.zadd(
        `${RedisKeys.RANKING}:${key}`,
        score,
        userId.toString(),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Redis 랭킹 업데이트 실패 : ${userId} `,
      );
    }
  }

  async getUserRank(userId: number, key: 'total' | number): Promise<number> {
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
