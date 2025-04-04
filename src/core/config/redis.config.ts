import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';

export const redisConfig = (configService: ConfigService) => {
  const options: RedisOptions = {
    host: configService.get<string>('REDIS_CONTAINER') || 'localhost',
    port: parseInt(configService.get<string>('REDIS_TCP_PORT') || '6379'),
    password: configService.get<string>('REDIS_PASSWORD'),
    retryStrategy: (times) => times * 1000,
  };

  return new Redis(options);
};
