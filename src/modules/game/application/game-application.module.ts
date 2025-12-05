import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameApplicationQueryService } from './game-application-query.service';
import { GameApplicationCommandService } from './game-application.command.service';
import { GameCoreModule } from '../core/game-core.module';
import { GameCrawlingModule } from '../infra/crawling/game-crawling.module';
import { GameApplicationCrawlingService } from './game-application-crawling.service';
import { GameCronScheduler } from './game-cron.scheduler';
import { RegisteredGameCoreModule } from 'src/modules/registered-game/core/registered-game-core.module';
import { RankCoreModule } from 'src/modules/rank/core/rank-core.module';
import { AccountCoreModule } from 'src/modules/account/core/account-core.module';
import { AwsS3Module } from 'src/core/aws-s3/aws-s3.module';
import { TeamModule } from 'src/modules/team/team.module';
import { StadiumModule } from 'src/modules/stadium/stadium.module';

@Module({
  imports: [
    GameCoreModule,
    GameCrawlingModule,
    RegisteredGameCoreModule,
    RankCoreModule,
    AccountCoreModule,
    TeamModule,
    StadiumModule,
    AwsS3Module,
  ],
  providers: [
    GameApplicationCommandService,
    GameApplicationQueryService,
    GameApplicationCrawlingService,
    GameCronScheduler,
  ],
  controllers: [GameController],
  exports: [GameCronScheduler],
})
export class GameApplicationModule {}
