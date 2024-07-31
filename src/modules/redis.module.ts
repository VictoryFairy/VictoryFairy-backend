import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from 'src/config/redis.config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: redisConfig,
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
