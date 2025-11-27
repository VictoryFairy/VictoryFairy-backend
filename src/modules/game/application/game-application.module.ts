import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameApplicationQueryService } from './game-application-query.service';
import { GameApplicationCommandService } from './game-application.command.service';
import { GameCoreModule } from '../core/game-core.module';
import { GameCrawlingModule } from '../infra/crawling/game-crawling.module';
import { GameApplicationCrawlingService } from './game-application-crawling.service';
import { GameCronScheduler } from './game-cron.scheduler';

@Module({
  imports: [GameCoreModule, GameCrawlingModule],
  providers: [
    GameApplicationCommandService,
    GameApplicationQueryService,
    GameApplicationCrawlingService,
    GameCronScheduler,
  ],
  controllers: [GameController],
})
export class GameApplicationModule {}
