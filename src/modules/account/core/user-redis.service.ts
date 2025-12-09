import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisKeys } from 'src/infra/redis/const/redis.const';
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
  ): Promise<Record<
    string,
    { id: number; nickname: string; profile_image: string }
  > | null> {
    console.log('userIds', userIds);
    const rawUserInfo = await this.redisClient.hmget(
      RedisKeys.USER_INFO,
      ...userIds.map((id) => id.toString()),
    );
    if (rawUserInfo[0] === null || rawUserInfo.length === 0) {
      return null;
    }

    const parsedInfo = {};
    Object.values(rawUserInfo).forEach((user) => {
      const obj = JSON.parse(user);
      parsedInfo[obj.id] = obj;
    });
    console.log('parsedInfo', parsedInfo);
    return parsedInfo;
  }
}
