import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ParkingInfoModule } from './modules/parking-info.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './config/database.config';
import { StadiumModule } from './modules/stadium.module';
import { TeamModule } from './modules/team.module';
import { RegisteredGameModule } from './modules/registered-game.module';
import { GameModule } from './modules/game.module';
import { RedisModule } from './modules/redis.module';
import { RankModule } from './modules/rank.module';
import { MailModule } from './modules/mail.module';
import { AwsS3Module } from './modules/aws-s3.module';
import { SeederService } from './services/seeder.service';
import { SchedulingModule } from './modules/scheduling.module';
import { CheeringSongModule } from './modules/cheering-song.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER } from '@nestjs/core';
import { CustomExceptionFilter } from './filters/cutstom-execption.filter';
import { SlackModule } from './modules/slack.module';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { AccountModule } from './account/account.module';

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
        return addTransactionalDataSource(new DataSource(options));
      },
      inject: [ConfigService],
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
  ],
})
export class AppModule {}
