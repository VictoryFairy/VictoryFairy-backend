import { InternalServerErrorException } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/const/redis.const';
import { InjectRedisClient } from 'src/decorator/redis-inject.decorator';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';

export class UserRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

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

  async getUserInfo(): Promise<
    Record<string, { id: number; nickname: string; profile_image: string }>
  > {
    const rawUserInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
    const parsedInfo = {};
    Object.values(rawUserInfo).forEach((user) => {
      const obj = JSON.parse(user);
      parsedInfo[obj.id] = obj;
    });
    return parsedInfo;
  }
}
