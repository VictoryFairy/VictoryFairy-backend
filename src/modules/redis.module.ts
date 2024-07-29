import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_CONTAINER');
        const port = parseInt(configService.get<string>('REDIS_TCP_PORT'));
        const password = configService.get<string>('REDIS_PASSWORD');
        return new Redis({
          host,
          port,
          password,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
