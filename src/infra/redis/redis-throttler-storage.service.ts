import Redis from 'ioredis';
import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const hits = await this.redisClient.incr(key);

    if (hits === 1) {
      await this.redisClient.expire(key, ttl);
    }

    const isBlocked = hits > limit;
    const timeToExpire = now + ttl * 1000;

    return {
      totalHits: hits,
      isBlocked,
      timeToExpire,
      timeToBlockExpire: blockDuration,
    };
  }
}
