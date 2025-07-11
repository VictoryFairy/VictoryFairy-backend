import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/core/config/redis.config';
import { RedisConnectionService } from 'src/core/redis/redis-connection.service';
import { AuthRedisService } from 'src/core/redis/auth-redis.service';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { RankingRedisService } from 'src/core/redis/ranking-redis.service';
import { TermRedisService } from 'src/core/redis/term-redis.service';
import { RedisThrottlerStorageService } from './redis-throttler-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: redisConfig,
      inject: [ConfigService],
    },
    RedisConnectionService,
    AuthRedisService,
    UserRedisService,
    RankingRedisService,
    TermRedisService,
    RedisThrottlerStorageService,
  ],
  exports: [
    RedisConnectionService,
    AuthRedisService,
    UserRedisService,
    RankingRedisService,
    TermRedisService,
    RedisThrottlerStorageService,
  ],
})
export class RedisModule {}
