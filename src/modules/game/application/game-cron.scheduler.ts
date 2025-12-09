import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SCHEDULER_NAME } from 'src/modules/game/application/const/scheduler-name.const';
import { GameApplicationCrawlingService } from './game-application-crawling.service';
import * as moment from 'moment-timezone';

@Injectable()
export class GameCronScheduler {
  private readonly logger = new Logger(GameCronScheduler.name);

  constructor(
    private readonly gameApplicationCrawlingService: GameApplicationCrawlingService,
  ) {}

  /**
   * 새벽 1시에 실행되는 크론잡
   * 이번 달과 다음 달 경기 데이터 크롤링 & 오늘의 경기 점수 크롤링 트리거 크론잡 설정
   * 앱 첫 시작시에도 실행
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: SCHEDULER_NAME.CRAWLING_JOB_1AM,
    timeZone: 'Asia/Seoul',
  })
  async setupThisAndNextMonthGameDataAndTodayGameTrigger(): Promise<void> {
    const todayDate = this.getTodayDate();
    this.logger.log(`Starting daily game data crawling for ${todayDate}`);

    // 이번달/다음달 경기 데이터 크롤링 및 저장
    await this.gameApplicationCrawlingService.getThisAndNextMonthGameData(
      todayDate,
    );

    // 오늘의 경기 조회 및 점수 크롤링 트리거 설정
    const todayGames =
      await this.gameApplicationCrawlingService.findGamesByDate(todayDate);
    await this.gameApplicationCrawlingService.setupTriggerForGameScoreCrawlingJob(
      todayGames,
    );

    this.logger.log(
      `Daily game data crawling completed. Today's games: ${todayGames.length}`,
    );
  }

  /**
   * 오늘의 날짜를 반환합니다.
   * @returns 오늘 날짜 문자열 (YYYY-MM-DD 형식)
   */
  private getTodayDate(): string {
    return moment().tz('Asia/Seoul').format('YYYY-MM-DD');
  }
}
