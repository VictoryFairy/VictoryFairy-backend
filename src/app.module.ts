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
import { UserModule } from './modules/user.module';
import { RedisModule } from './modules/redis.module';
import { RankModule } from './modules/rank.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './modules/mail.module';
import { AwsS3Module } from './modules/aws-s3.module';
import { SeederService } from './services/seeder.service';
import { SchedulingModule } from './modules/scheduling.module';
import { CheeringSongModule } from './modules/cheering-song.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER } from '@nestjs/core';
import { CustomExceptionFilter } from './filters/cutstom-execption.filter';
import { SlackModule } from './modules/slack.module';
import { TermModule } from './modules/term.module';
import { TypeOrmExceptionFilter } from './filters/typeorm-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot({}),
    ParkingInfoModule,
    StadiumModule,
    TeamModule,
    RegisteredGameModule,
    GameModule,
    UserModule,
    RankModule,
    AuthModule,
    MailModule,
    AwsS3Module,
    SchedulingModule,
    CheeringSongModule,
    RedisModule,
    SlackModule,
    TermModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeederService,
    // 가장 위가 마지막에 실행
    { provide: APP_FILTER, useClass: CustomExceptionFilter },
    { provide: APP_FILTER, useClass: TypeOrmExceptionFilter },
  ],
})
export class AppModule {}
