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
import { getDatabaseConfig } from 'src/core/config/database.config';
import { RedisThrottlerStorageService } from 'src/core/redis/redis-throttler-storage.service';
import { RedisModule } from 'src/core/redis/redis.module';
import { SeederService } from 'src/core/seeder/seeder.service';
import { SlackModule } from 'src/core/slack/slack.module';
import { AccountModule } from 'src/modules/account/account.module';
import { CheeringSongModule } from 'src/modules/cheering-song/cheering-song.module';
import { GameModule } from 'src/modules/game/game.module';
import { ParkingInfoModule } from 'src/modules/parking-info/parking-info.module';
import { RankModule } from 'src/modules/rank/rank.module';
import { RegisteredGameModule } from 'src/modules/registered-game/registered-game.module';
import { SchedulingModule } from 'src/modules/scheduling/scheduling.module';
import { StadiumModule } from 'src/modules/stadium/stadium.module';
import { TeamModule } from 'src/modules/team/team.module';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';

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
    RedisModule,
    ParkingInfoModule,
    StadiumModule,
    TeamModule,
    RegisteredGameModule,
    GameModule,
    AccountModule,
    RankModule,
    SchedulingModule,
    CheeringSongModule,
    SlackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class TestAppModule {}
