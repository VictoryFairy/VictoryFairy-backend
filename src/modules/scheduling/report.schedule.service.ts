import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RegisteredGameService } from '../registered-game/registered-game.service';
import { UserService } from '../user/user.service';
import * as moment from 'moment';
import { Between } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ReportScheduleService implements OnModuleInit {
  private readonly discordWebhookUrl: string | undefined;
  private readonly logger = new Logger(ReportScheduleService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly registeredGameService: RegisteredGameService,
  ) {
    this.discordWebhookUrl = this.configService.get(
      'DISCORD_REPORT_WEBHOOK',
      '',
    );
  }

  async onModuleInit() {
    if (!this.discordWebhookUrl) {
      this.logger.warn('DISCORD_REPORT_WEBHOOK 없으므로 크론잡 등록 X');
      return;
    }
    const cronjob = new CronJob(
      CronExpression.EVERY_DAY_AT_9AM,
      async () => {
        await this.sendReport();
      },
      null,
      false,
      'Asia/Seoul',
    );
    cronjob.start();
  }

  async sendReport() {
    const report = await this.buildDailyReport();
    try {
      const result = await axios.post(this.discordWebhookUrl, {
        embeds: [report],
      });
      return result;
    } catch (error) {
      this.logger.error(
        `일일 리포트 전송 실패 ${moment().tz('Asia/Seoul').subtract(1, 'day').format('YYYY-MM-DD')}`,
      );
      return null;
    }
  }

  private async buildDailyReport() {
    const yesterday = moment().tz('Asia/Seoul').subtract(1, 'day');
    const startOfYesterday = yesterday.clone().startOf('day').toDate();
    const endOfYesterday = yesterday.clone().endOf('day').toDate();

    const userCount = await this.userService.countUsers({
      created_at: Between(startOfYesterday, endOfYesterday),
    });
    const registeredGameCount =
      await this.registeredGameService.countRegisteredGames({
        created_at: Between(startOfYesterday, endOfYesterday),
      });

    return {
      title: `${yesterday.format('YYYY-MM-DD')} - 일일 리포트`,
      fields: [
        { name: '신규 유저', value: userCount || 0 },
        { name: '신규 직관 등록', value: registeredGameCount || 0 },
      ],
    };
  }
}
