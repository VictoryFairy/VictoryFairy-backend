import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { CustomThrottlerGuard } from 'src/common/guard/custom-throttler.guard';
import { getDatabaseConfig } from 'src/config/database.config';
import { RedisThrottlerStorageService } from 'src/infra/redis/redis-throttler-storage.service';
import { RedisModule } from 'src/infra/redis/redis.module';
import { SeederService } from 'src/infra/seeder/seeder.service';
import { ParkingInfoApplicationModule } from 'src/modules/parking-info/application/parking-info-application.module';
import { StadiumApplicationModule } from 'src/modules/stadium/application/stadium-application.module';
import { TeamApplicationModule } from 'src/modules/team/application/team-application.module';
import { AccountApplicationModule } from 'src/modules/account/application/account-application.module';
import { RankApplicationModule } from 'src/modules/rank/application/rank-application.module';
import { GameApplicationModule } from 'src/modules/game/application/game-application.module';
import { RegisteredGameApplicationModule } from 'src/modules/registered-game/application/registered-game-application.module';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AwsS3Module } from 'src/infra/aws-s3/aws-s3.module';
import { ExternalChannelModule } from 'src/infra/external-channel/external-channel.module';
import { MailModule } from 'src/infra/mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CheeringSongApplicationModule } from 'src/modules/cheering-song/application/cheering-song-application.module';
import { DomainExceptionFilter } from 'src/common/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        try {
          const dataSource = await new DataSource(options).initialize();
          return addTransactionalDataSource(dataSource);
        } catch (error) {
          console.error('Failed to initialize database connection:', error);
          throw error;
        }
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
    ScheduleModule.forRoot(),
    RedisModule,
    ParkingInfoApplicationModule,
    StadiumApplicationModule,
    TeamApplicationModule,
    AccountApplicationModule,
    RankApplicationModule,
    GameApplicationModule,
    RegisteredGameApplicationModule,
    AuthModule,
    AwsS3Module,
    MailModule,
    ExternalChannelModule,
    // WorkerModule,
    CheeringSongApplicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class TestAppModule {}
