import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CronExpression } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Between, EntityManager } from 'typeorm';
import * as moment from 'moment-timezone';
import { DiscordService } from 'src/infra/external-channel/discord.service';
import { User } from 'src/modules/account/core/domain/user.entity';
import { RegisteredGame } from 'src/modules/registered-game/core/domain/registered-game.entity';

@Injectable()
export class DailyReportScheduler implements OnModuleInit {
  private readonly logger = new Logger(DailyReportScheduler.name);

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly discordService: DiscordService,
  ) {}

  async onModuleInit() {
    if (!this.discordService.isConfigured()) {
      this.logger.warn('DISCORD_REPORT_WEBHOOK 없으므로 크론잡 등록 X');
      return;
    }
    const cronjob = new CronJob(
      CronExpression.EVERY_DAY_AT_9AM,
      async () => {
        await this.sendDailyReport();
      },
      null,
      false,
      'Asia/Seoul',
    );
    cronjob.start();
    this.logger.log('일일 리포트 크론잡이 등록되었습니다.');
  }

  /**
   * 일일 리포트를 생성하여 Discord로 전송합니다.
   */
  async sendDailyReport(): Promise<void> {
    try {
      const report = await this.buildDailyReport();
      const isSuccess = await this.discordService.sendMessage([report]);
      if (isSuccess) {
        this.logger.log('일일 리포트 전송 성공');
      } else {
        this.logger.error('일일 리포트 전송 실패');
      }
    } catch (error) {
      this.logger.error(
        `일일 리포트 전송 실패 ${moment().tz('Asia/Seoul').subtract(1, 'day').format('YYYY-MM-DD')}`,
        error,
      );
    }
  }

  /**
   * 일일 리포트 데이터를 생성합니다.
   */
  private async buildDailyReport() {
    const yesterday = moment().tz('Asia/Seoul').subtract(1, 'day');
    const startOfYesterday = yesterday.clone().startOf('day').toDate();
    const endOfYesterday = yesterday.clone().endOf('day').toDate();
    const [userCount, registeredGameCount] = await Promise.all([
      this.countNewUsersByDateRange(startOfYesterday, endOfYesterday),
      this.countNewRegistrationsByDateRange(startOfYesterday, endOfYesterday),
    ]);
    return {
      title: `${yesterday.format('YYYY-MM-DD')} - 일일 리포트`,
      fields: [
        { name: '신규 유저', value: userCount || 0 },
        { name: '신규 직관 등록', value: registeredGameCount || 0 },
      ],
    };
  }

  /**
   * 특정 기간 동안 가입한 신규 유저 수를 조회합니다.
   */
  private async countNewUsersByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.em.count(User, {
      where: { created_at: Between(startDate, endDate) },
    });
  }

  /**
   * 특정 기간 동안 등록된 직관 수를 조회합니다.
   */
  private async countNewRegistrationsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.em.count(RegisteredGame, {
      where: { created_at: Between(startDate, endDate) },
    });
  }
}
