import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';

export const redisConfig = (configService: ConfigService) => {
  const options: RedisOptions = {
    host: configService.get<string>('REDIS_CONTAINER') || 'localhost',
    port: parseInt(configService.get<string>('REDIS_TCP_PORT')),
    password: configService.get<string>('REDIS_PASSWORD'),
  };

  return new Redis(options);
};
