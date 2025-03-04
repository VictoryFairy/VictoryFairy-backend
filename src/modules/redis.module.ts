import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/config/redis.config';
import { RedisConnectionService } from 'src/services/redis-connection.service';
import { AuthRedisService } from 'src/services/auth-redis.service';
import { UserRedisService } from 'src/services/user-redis.service';
import { RankingRedisService } from 'src/services/ranking-redis.service';
import { TermRedisService } from 'src/services/term-redis.service';

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
  ],
  exports: [
    RedisConnectionService,
    AuthRedisService,
    UserRedisService,
    RankingRedisService,
    TermRedisService,
  ],
})
export class RedisModule {}
