import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ParkingInfoModule } from './modules/parking-info/parking-info.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './core/config/database.config';
import { StadiumModule } from './modules/stadium/stadium.module';
import { TeamModule } from './modules/team/team.module';
import { RegisteredGameModule } from './modules/registered-game/registered-game.module';
import { RedisModule } from './core/redis/redis.module';
import { MailModule } from './core/mail/mail.module';
import { AwsS3Module } from './core/aws-s3/aws-s3.module';
import { SeederService } from './core/seeder/seeder.service';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { CheeringSongModule } from './modules/cheering-song/cheering-song.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CustomExceptionFilter } from './common/filters/custom-exception.filter';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { AccountModule } from './modules/account/account.module';
import { RequestMetaMiddleware } from './common/middleware/request-meta.middleware';
import { GameModule } from './modules/game/game.module';
import { RankModule } from './modules/rank/rank.module';
import { SlackModule } from './core/slack/slack.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorageService } from './core/redis/redis-throttler-storage.service';
import { CustomThrottlerGuard } from './common/guard/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        const dataSource = await new DataSource(options).initialize();
        return addTransactionalDataSource(dataSource);
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorageService],
      useFactory: (redisThrottlerStorage: RedisThrottlerStorageService) => ({
        throttlers: [
          {
            ttl: 60,
            limit: 120,
          },
        ],
        storage: redisThrottlerStorage,
      }),
    }),
    EventEmitterModule.forRoot({}),
    RedisModule,
    ParkingInfoModule,
    StadiumModule,
    TeamModule,
    RegisteredGameModule,
    GameModule,
    AccountModule,
    RankModule,
    MailModule,
    AwsS3Module,
    SchedulingModule,
    CheeringSongModule,
    SlackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    { provide: APP_FILTER, useClass: CustomExceptionFilter },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMetaMiddleware).forRoutes('*');
  }
}
