import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ParkingInfoApplicationModule } from './modules/parking-info/application/parking-info-application.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './config/database.config';
import { StadiumApplicationModule } from './modules/stadium/application/stadium-application.module';
import { TeamApplicationModule } from './modules/team/application/team-application.module';
import { RedisModule } from './infra/redis/redis.module';
import { MailModule } from './infra/mail/mail.module';
import { AwsS3Module } from './infra/aws-s3/aws-s3.module';
import { SeederService } from './infra/seeder/seeder.service';
import { CheeringSongApplicationModule } from './modules/cheering-song/application/cheering-song-application.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { RequestMetaMiddleware } from './common/middleware/request-meta.middleware';
import { ExternalChannelModule } from './infra/external-channel/external-channel.module';
import { WorkerModule } from './modules/worker/worker.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorageService } from './infra/redis/redis-throttler-storage.service';
import { CustomThrottlerGuard } from './common/guard/custom-throttler.guard';
import { IDotenv } from './config/dotenv.interface';
import { AccountApplicationModule } from './modules/account/application/account-application.module';
import { RankApplicationModule } from './modules/rank/application/rank-application.module';
import { GameApplicationModule } from './modules/game/application/game-application.module';
import { RegisteredGameApplicationModule } from './modules/registered-game/application/registered-game-application.module';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';

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
      inject: [ConfigService<IDotenv>],
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
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({}),
    RedisModule,
    ParkingInfoApplicationModule,
    StadiumApplicationModule,
    TeamApplicationModule,
    AccountApplicationModule,
    RankApplicationModule,
    GameApplicationModule,
    RegisteredGameApplicationModule,
    AuthModule,
    MailModule,
    AwsS3Module,
    ExternalChannelModule,
    WorkerModule,
    CheeringSongApplicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMetaMiddleware).forRoutes('*');
  }
}
