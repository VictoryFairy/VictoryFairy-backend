import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { CronJob } from 'cron';
import * as moment from 'moment-timezone';
import { getNextMonth } from 'src/common/utils/get-next-month.util';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GameService } from 'src/modules/game/game.service';
import { RegisteredGameService } from 'src/modules/registered-game/registered-game.service';
import { upsertSchedules } from './game-crawling.util';
import { Game } from '../game/entities/game.entity';
import { SCHEDULER_NAME } from './type/schedule-job-name.type';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly gameService: GameService,
    private readonly registeredGameService: RegisteredGameService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}
  /**
   * @description
   * 새벽 1시에 실행되는 크론잡
   * 이번 달과 다음 달 경기 데이터 크롤링 & 오늘의 경기 점수 크롤링 트리거 크론잡 설정
   * 앱 첫 시작시에도 실행
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: SCHEDULER_NAME.CRAWLING_JOB_1AM,
    timeZone: 'Asia/Seoul',
  })
  async setupThisAndNextMonthGameDataAndTodayGameTrigger() {
    const todayDate = this.getTodayDate();
    const todayGames = await this.gameService.findGamesByDate(todayDate);

    await this.getThisAndNextMonthGameData(todayDate);
    await this.setupTriggerForGameScoreCrawlingJob(todayGames);
  }

  /**
   * @description
   * 이번달 경기와 다음달 경기 데이터를 크롤링
   */
  async getThisAndNextMonthGameData(date: string): Promise<void> {
    try {
      const fullDate = date.split('-').map(Number);
      const [currentYear, currentMonth] = [fullDate[0], fullDate[1]];
      const { nextYear, nextMonth } = getNextMonth(currentYear, currentMonth);
      // 현재 달 데이터 업데이트
      await upsertSchedules({
        year: currentYear,
        month: currentMonth,
        dataSource: this.dataSource,
      });
      // 다음 달 데이터 업데이트
      await upsertSchedules({
        year: nextYear,
        month: nextMonth,
        dataSource: this.dataSource,
      });
    } catch (error) {
      this.logger.error('Error in getThisAndNextMonthGameData', error.stack);
      throw error;
    }
  }

  /**
   * @description
   * 점수 크롤링 트리거 크론잡 설정 -> 1분 간격 점수 크롤링 크론잡을 가져와 실행
   **/
  async setupTriggerForGameScoreCrawlingJob(games: Game[]): Promise<void> {
    for (const game of games) {
      const [hour, minute, second] = game.time?.split(':').map(Number);
      const [year, month, day] = game.date?.split('-').map(Number);
      const tzDate = {
        year,
        month: month - 1,
        day,
        hour,
        minute,
        second,
      };

      // 기존 중복된 trigger 크론잡 있으면 삭제
      this.deleteExistingCronJob(`${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`);

      const triggerTime = moment.tz(tzDate, 'Asia/Seoul').toDate(); // 2025-05-22T09:30:00.000Z
      const now = moment().tz('Asia/Seoul').toDate();
      // 현재 시간이 트리거 시간보다 이전이면 바로 시작
      if (triggerTime < now) {
        this.logger.log(
          `Trigger time already passed for game ${game.id}, starting score job immediately.`,
        );
        await this.handleGameTriggerJob(game); // 바로 시작
      } else {
        const triggerForGameScore = new CronJob(
          triggerTime,
          async () => {
            await this.handleGameTriggerJob(game);
            // 트리거 실행 완료 후 해당 트리거 크론잡 삭제
            const triggerJobName = `${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`;
            this.deleteExistingCronJob(triggerJobName);
          },
          null,
          false,
          'Asia/Seoul',
        );
        this.schedulerRegistry.addCronJob(
          `${SCHEDULER_NAME.GAME_TRIGGER}-${game.id}`,
          triggerForGameScore,
        );

        triggerForGameScore.start();
      }
    }
  }

  /**
   * @description
   * 게임 트리거 크론잡이 수행할 일 : 1분마다 게임 점수 크롤링 작업을 생성하고 등록
   */
  private async handleGameTriggerJob(game: Game): Promise<void> {
    // 기존 중복된 update-game-score 크론잡 있으면 삭제
    this.deleteExistingCronJob(
      `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${game.id}`,
    );
    const gameJob = await this.createGameScoreJobForOneMinute(game.id);
    this.schedulerRegistry.addCronJob(
      `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${game.id}`,
      gameJob,
    );
    gameJob.start();
  }

  /**
   * @description
   * 점수 크롤링을 1분마다 실행할 크론잡 생성
   * @return
   * CronJob
   **/
  private async createGameScoreJobForOneMinute(
    gameId: string,
  ): Promise<CronJob> {
    const seriesId = this.configService.get<number>('SERIES_ID');
    const intervalJob = new CronJob(
      CronExpression.EVERY_MINUTE,
      async () => {
        const currentStatus = await firstValueFrom(
          this.gameService.getCurrentGameStatus(
            1,
            seriesId,
            gameId,
            new Date().getFullYear(),
          ),
        );
        await this.gameService.updateStatusRepeatedly(gameId, currentStatus);
        if (currentStatus.status === '경기종료') {
          this.logger.log(`Game ${gameId} ended. Stopping updates.`);
          await this.gameService.updateStatusFinally(gameId, currentStatus);
          intervalJob.stop(); // Updates stopped
          return;
        } else if (/.*취소$/.test(currentStatus.status)) {
          this.logger.log(`Game ${gameId} canceled. Stopping updates.`);
          await this.gameService.updateStatusFinally(gameId, currentStatus);
          intervalJob.stop(); // Updates stopped
          return;
        }
      },
      async () => {
        // 완료 시 경기결과 나오기전 직관 등록 데이터들 업데이트 및 랭킹 업데이트
        await this.registeredGameService.batchBulkUpdateByGameId(gameId);
        // 멈춘 크론잡 삭제
        const jobName = `${SCHEDULER_NAME.UPDATE_GAME_SCORE}-${gameId}`;
        this.deleteExistingCronJob(jobName);
      },
      true,
      'Asia/Seoul',
    );
    return intervalJob;
  }

  /**
   * @description
   * 기존 크론잡 삭제
   * @param jobName string
   **/
  private deleteExistingCronJob(jobName: string) {
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.logger.log(`${jobName} already exists. Deleting...`);
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  /**
   * @description
   * 오늘의 날짜를 반환
   * @return
   * string
   **/
  private getTodayDate(): string {
    return moment().tz('Asia/Seoul').format('YYYY-MM-DD');
  }
}
