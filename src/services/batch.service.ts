import { Injectable } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { GameService } from "./game.service";
import { firstValueFrom } from "rxjs";
import { CronJob } from "cron";

@Injectable()
export class BatchService {
  constructor(
    private readonly gameService: GameService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4PM, {
    name: 'batchUpdateGames'
  })
  batchUpdateGames() {
    this.gameService.getSchedules().subscribe({
      next: () => { console.log('Start to save Game Data...') },
      complete: () => { console.log('Game Data Saved Successfully.') },
      error: (error) => { throw new Error(error) },
    });
  }

  async batchUpdateTodayGames() {
    const allCronJobs = this.schedulerRegistry.getCronJobs();
    allCronJobs.forEach((_, jobName) => {
      if (/^batchUpdate.*$/.test(jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        console.log(`남아 있던 경기 ${jobName} 업데이트를 중지합니다.`);
      }
    });

    const todayGameIds = await this.gameService.getTodayGameIds();

    todayGameIds.forEach(gameId => {
      this.setupGameUpdateScheduler(gameId);
    })
  }

  private setupGameUpdateScheduler(gameId: string) {
    const currentYear = new Date().getFullYear();
    const job = new CronJob(CronExpression.EVERY_MINUTE, async () => {
      const currentStatus = await firstValueFrom(this.gameService.getCurrentGameStatus(
        1, 0, gameId, currentYear
      ));

      await this.gameService.updateCurrentStatus(gameId, currentStatus);

      if (currentStatus.status === '경기종료') {
        this.schedulerRegistry.deleteCronJob(`batchUpdate${gameId}`);
        console.log(`경기 ${gameId}가 종료되어 업데이트를 중지합니다.`);
      }
    });

    this.schedulerRegistry.addCronJob(`batchUpdate${gameId}`, job);

    job.start();
  }
}