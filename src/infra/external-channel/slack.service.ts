import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingWebhook } from '@slack/webhook';
import { IDotenv } from '../../config/dotenv.interface';

@Injectable()
export class SlackService {
  private readonly webhook: IncomingWebhook;
  constructor(private readonly configService: ConfigService<IDotenv>) {
    this.webhook = new IncomingWebhook(
      this.configService.get('SLACK_WEBHOOK_URL', { infer: true }) || '',
    );
  }

  async sendInternalErrorNotification(
    message: string,
    errorName: string,
  ): Promise<void> {
    await this.webhook.send({
      text: `에러 발생 : ${message}`,
      attachments: [
        {
          color: 'danger',
          fields: [{ title: '에러 이름', value: errorName }],
        },
      ],
    });
  }
}
