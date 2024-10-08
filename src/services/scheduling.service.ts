import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { GameService } from './game.service';
import { firstValueFrom, forkJoin } from 'rxjs';
import { CronJob } from 'cron';
import * as moment from 'moment-timezone';
import { RegisteredGameService } from './registered-game.service';
import { getNextMonth } from 'src/utils/get-next-month.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly gameService: GameService,
    private readonly registeredGameService: RegisteredGameService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'batchUpdateGames',
    timeZone: 'Asia/Seoul',
  })
  async batchUpdateGames() {
    // 이번 달과 다음 달의 모든 경기 일정을 가져오고, 오늘의 경기에 대한 업데이트 스케줄을 설정합니다.
    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1;

    const { nextYear, nextMonth } = getNextMonth(currentYear, currentMonth);

    forkJoin([
      this.gameService.upsertSchedules(currentYear, currentMonth),
      this.gameService.upsertSchedules(nextYear, nextMonth),
    ]).subscribe({
      next: () => {
        // 성공적으로 두 Observable의 결과를 가져온 경우
        this.logger.log('Game Data for both months saved successfully.');
        this.batchUpdateTodayGames(); // 오늘의 경기 업데이트 스케쥴 작성
      },
      error: (error) => {
        // 오류가 발생한 경우
        this.logger.error('Error in batchUpdateGames', error.stack);
      },
    });
  }

  private async batchUpdateTodayGames() {
    // 기존의 batchUpdate{gameId} 형식의 CronJob을 중지하고 삭제합니다.
    const allCronJobs = this.schedulerRegistry.getCronJobs();
    allCronJobs.forEach((job, jobName) => {
      if (jobName === 'batchUpdateGames') return;
      if (/^batchUpdate.*$/.test(jobName)) {
        job.stop();
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Stopped and removed existing job ${jobName}.`);
      }
    });

    // 오늘의 경기 ID를 가져옵니다.
    const todayGameIds = await this.gameService.getTodayGameIds();

    await Promise.all(
      todayGameIds.map(async (gameId) => {
        const startTime = await this.gameService.getGameTime(gameId); // HH:MM
        this.setupGameUpdateScheduler(gameId, startTime);
      }),
    );
  }

  private setupGameUpdateScheduler(gameId: string, startTime: string) {
    const seriesId = this.configService.get<number>('SERIES_ID');
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const now = moment(); // 현재 시간을 가져옵니다.
    const startDateTime = moment.tz(
      {
        year: now.year(),
        month: now.month(), // month는 0부터 시작합니다. (0: January, 11: December)
        day: now.date(),
        hour: startHour,
        minute: startMinute,
      },
      'Asia/Seoul', // 원하는 타임존을 설정합니다.
    );

    // 현재 시간과 시작 시간 사이의 차이를 계산합니다.
    const timeUntilStart = startDateTime.diff(now);

    // 시작 시간에 도달하면 설정된 작업을 수행합니다.
    setTimeout(() => {
      this.logger.log(
        `Starting updates for game ${gameId} at ${startDateTime}`,
      );

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

          this.logger.log(`Current game status is ${currentStatus.status}.`);
          await this.gameService.updateStatusRepeatedly(gameId, currentStatus);
          this.logger.log(`Score for Game ${gameId} updated.`);
          if (currentStatus.status === '경기종료') {
            this.logger.log(`Game ${gameId} ended. Stopping updates.`);
            await this.gameService.updateStatusFinally(gameId, currentStatus);
            intervalJob.stop(); // Updates stopped
          } else if (/.*취소$/.test(currentStatus.status)) {
            this.logger.log(`Game ${gameId} cancled. Stopping updates.`);
            await this.gameService.updateStatusFinally(gameId, currentStatus);
            intervalJob.stop(); // Updates stopped
          }
        },
        async () => {
          // Cronjob 종료 시
          await this.registeredGameService.batchBulkUpdateByGameId(gameId);
        },
        true,
        'Asia/Seoul',
      );

      this.schedulerRegistry.addCronJob(`batchUpdate${gameId}`, intervalJob);
      intervalJob.start();
    }, timeUntilStart);

    this.logger.log(
      `Scheduled initial job for game ${gameId} at ${startDateTime}`,
    );
  }
}
