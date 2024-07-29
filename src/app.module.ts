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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    ParkingInfoModule,
    StadiumModule,
    TeamModule,
    RegisteredGameModule,
    GameModule,
    UserModule,
    RedisModule,
    RankModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
