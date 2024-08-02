import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { GameService } from "./game.service";
import { firstValueFrom } from "rxjs";
import { CronJob } from "cron";
import * as moment from "moment-timezone";

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    private readonly gameService: GameService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4PM, {
    name: 'batchUpdateGames',
    timeZone: 'Asia/Seoul',
  })
  async batchUpdateGames() {
    // 모든 경기 일정을 가져오고, 오늘의 경기에 대한 업데이트 스케줄을 설정합니다.
    this.gameService.getSchedules().subscribe({
      complete: () => {
        this.logger.log('Game Data Saved Successfully.');
        this.batchUpdateTodayGames();
      },
      error: (error) => {
        this.logger.error('Error in batchUpdateGames', error.stack);
      }
    });
  }

  private async batchUpdateTodayGames() {
    // 기존의 batchUpdate{gameId} 형식의 CronJob을 중지하고 삭제합니다.
    const allCronJobs = this.schedulerRegistry.getCronJobs();
    allCronJobs.forEach((_, jobName) => {
      if (/^batchUpdate.*$/.test(jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Stopped and removed existing job ${jobName}.`);
      }
    });

    // 오늘의 경기 ID를 가져옵니다.
    const todayGameIds = await this.gameService.getTodayGameIds();
    
    await Promise.all(todayGameIds.map(async gameId => {
      const startTime = await this.gameService.getGameTime(gameId); // HH:MM
      this.setupGameUpdateScheduler(gameId, startTime);
    }));
  }

  private setupGameUpdateScheduler(gameId: string, startTime: string) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const now = moment();  // 현재 시간을 가져옵니다.
    const startDateTime = moment.tz(
      {
        year: now.year(),
        month: now.month(),  // month는 0부터 시작합니다. (0: January, 11: December)
        day: now.date(),
        hour: startHour,
        minute: startMinute
      },
      'Asia/Seoul'  // 원하는 타임존을 설정합니다.
    );

    // 시작 시간이 현재 시간보다 이전일 경우 실행하지 않습니다.
    if (startDateTime < now) {
      this.logger.warn(`Start time ${startDateTime} for game ${gameId} is in the past. Skipping.`);
      return;
    }

    // 현재 시간과 시작 시간 사이의 차이를 계산합니다.
    const timeUntilStart = startDateTime.diff(now);

    // 시작 시간에 도달하면 설정된 작업을 수행합니다.
    setTimeout(() => {
      this.logger.log(`Starting updates for game ${gameId} at ${startDateTime}`);
      
      const intervalJob = new CronJob(CronExpression.EVERY_MINUTE, async () => {
        const currentStatus = await firstValueFrom(this.gameService.getCurrentGameStatus(
          1, 0, gameId, new Date().getFullYear()
        ));

        await this.gameService.updateCurrentStatus(gameId, currentStatus);

        if (currentStatus.status === '경기종료') {
          this.schedulerRegistry.deleteCronJob(`batchUpdate${gameId}`);
          this.logger.log(`Game ${gameId} ended. Stopping updates.`);
          intervalJob.stop(); // Updates stopped
        }
      }, null, true, 'Asia/Seoul');

      this.schedulerRegistry.addCronJob(`batchUpdate${gameId}`, intervalJob);
      intervalJob.start();
    }, timeUntilStart);

    this.logger.log(`Scheduled initial job for game ${gameId} at ${startDateTime}`);
  }
}
