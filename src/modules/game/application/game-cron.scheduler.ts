import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SCHEDULER_NAME } from 'src/modules/scheduling/type/schedule-job-name.type';
import { GameApplicationCrawlingService } from './game-application-crawling.service';
import * as moment from 'moment-timezone';

@Injectable()
export class GameCronScheduler {
  constructor(
    private readonly gameApplicationCrawlingService: GameApplicationCrawlingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: SCHEDULER_NAME.CRAWLING_JOB_1AM,
    timeZone: 'Asia/Seoul',
  })
  async setupThisAndNextMonthGameDataAndTodayGameTrigger() {
    const todayDate = this.getTodayDate();
    await this.gameApplicationCrawlingService.getThisAndNextMonthGameData(
      todayDate,
    );
  }

  private getTodayDate(): string {
    return moment().tz('Asia/Seoul').format('YYYY-MM-DD');
  }
}
