import { Module } from '@nestjs/common';
import { GameScheduleCrawlingService } from './game-schedule.crawling.service';
import { GameScoreCrawlingService } from './game-score.crawling.service';

@Module({
  providers: [GameScheduleCrawlingService, GameScoreCrawlingService],
  exports: [GameScheduleCrawlingService, GameScoreCrawlingService],
})
export class GameCrawlingModule {}
