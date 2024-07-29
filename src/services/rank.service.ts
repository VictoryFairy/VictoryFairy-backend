import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RankService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async saveTest() {
    const result = await this.redisClient.zadd(
      'Ranking',
      70,
      'seoul',
      60,
      'london',
      50,
      'paris',
    );
    return result;
  }

  async getTest() {
    const result = await this.redisClient.zrevrange(
      'Ranking',
      0,
      1,
      'WITHSCORES',
    );
    return result;
  }

  async delTest() {
    return await this.redisClient.del('Ranking');
  }
}
