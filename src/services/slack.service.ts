import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingWebhook } from '@slack/webhook';

@Injectable()
export class SlackService {
  private readonly webhook: IncomingWebhook;
  constructor(private readonly configService: ConfigService) {
    this.webhook = new IncomingWebhook(
      this.configService.get<string>('SLACK_WEBHOOK_URL'),
    );
  }

  async sendInternalErrorNotification(
    message: string,
    errorName: string,
    errorStack: string,
  ): Promise<void> {
    await this.webhook.send({
      text: `에러 발생 : ${message}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: '에러 이름', value: errorName },
            { title: '에러 스택', value: errorStack },
          ],
        },
      ],
    });
  }
}
