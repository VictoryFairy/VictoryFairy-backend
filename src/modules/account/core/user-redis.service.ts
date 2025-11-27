import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/core/redis/const/redis.const';
import { InjectRedisClient } from 'src/common/decorators/redis-inject.decorator';

export class UserRedisService {
  constructor(
    @InjectRedisClient()
    private readonly redisClient: Redis,
  ) {}

  async saveUsers(
    userInfos: { id: number; nickname: string; profileImage: string }[],
  ) {
    const pipelined = this.redisClient.pipeline();
    for (const userInfo of userInfos) {
      pipelined.hset(`${RedisKeys.USER_INFO}:${userInfo.id}`, userInfo);
    }
    await pipelined.exec();
    return;
  }

  async deleteUser(userId: number) {
    try {
      await this.redisClient.del(`${RedisKeys.USER_INFO}:${userId.toString()}`);
    } catch (error) {
      throw new InternalServerErrorException('Redis userInfo 삭제 실패');
    }
  }

  async updateFieldsOfUser(
    userId: number,
    updateInput: { field: 'nickname' | 'profileImage'; value: string },
  ): Promise<void> {
    try {
      const isExist = await this.redisClient.exists(
        `${RedisKeys.USER_INFO}:${userId.toString()}`,
      );
      if (!isExist) {
        throw new NotFoundException('유저 정보가 존재하지 않습니다.');
      }
      await this.redisClient.hset(
        `${RedisKeys.USER_INFO}:${userId.toString()}`,
        updateInput,
      );
      return;
    } catch (error) {
      throw new InternalServerErrorException('Redis userInfo 업데이트 실패');
    }
  }

  async getUserInfoByIds(
    userIds: number[],
  ): Promise<
    Record<string, { id: number; nickname: string; profileImage: string }>
  > {
    const rawUserInfo = await this.redisClient.hmget(
      RedisKeys.USER_INFO,
      ...userIds.map((id) => id.toString()),
    );
    const parsedInfo = {};
    Object.values(rawUserInfo).forEach((user) => {
      const obj = JSON.parse(user);
      parsedInfo[obj.id] = obj;
    });
    return parsedInfo;
  }

  // async getUserList() {
  //   try {
  //     const userInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
  //     const cachedUsers = Object.entries(userInfo).reduce(
  //       (acc, [id, userInfoString]) => {
  //         acc[parseInt(id)] = JSON.parse(userInfoString);
  //         return acc;
  //       },
  //       {},
  //     );
  //     return cachedUsers;
  //   } catch (error) {
  //     throw new InternalServerErrorException('캐싱 유저 읽기 실패');
  //   }
  // }

  // async userSynchronizationTransaction(userId: number, teams: Team[]) {
  //   const redisTransaction = this.redisClient.multi();
  //   // redis caching 동기화
  //   redisTransaction.hdel(RedisKeys.USER_INFO, userId.toString());
  //   redisTransaction.zrem(`${RedisKeys.RANKING}:total`, [userId]);
  //   for (const team of teams) {
  //     redisTransaction.zrem(`${RedisKeys.RANKING}:${team.id}`, [userId]);
  //   }
  //   const redisExecResult = await redisTransaction.exec();
  //   if (!redisExecResult) {
  //     throw new InternalServerErrorException('Redis 캐시 동기화 실패');
  //   }
  // }

  // async getUserInfo(): Promise<
  //   Record<string, { id: number; nickname: string; profile_image: string }>
  // > {
  //   const rawUserInfo = await this.redisClient.hgetall(RedisKeys.USER_INFO);
  //   const parsedInfo = {};
  //   Object.values(rawUserInfo).forEach((user) => {
  //     const obj = JSON.parse(user);
  //     parsedInfo[obj.id] = obj;
  //   });
  //   return parsedInfo;
  // }

  // async getUserInfoById(
  //   userId: number,
  // ): Promise<{ id: number; nickname: string; profile_image: string }> {
  //   const userInfo = await this.redisClient.hget(
  //     RedisKeys.USER_INFO,
  //     userId.toString(),
  //   );
  //   return userInfo ? JSON.parse(userInfo) : null;
  // }
}
