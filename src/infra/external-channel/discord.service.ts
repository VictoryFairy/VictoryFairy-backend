import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IDotenv } from '../../config/dotenv.interface';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string | number; inline?: boolean }[];
  timestamp?: string;
}

@Injectable()
export class DiscordService {
  private readonly webhookUrl: string;
  private readonly logger = new Logger(DiscordService.name);

  constructor(private readonly configService: ConfigService<IDotenv>) {
    this.webhookUrl =
      this.configService.get('DISCORD_REPORT_WEBHOOK', { infer: true }) || '';
  }

  /**
   * Discord 웹훅 URL이 설정되어 있는지 확인합니다.
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Discord 웹훅으로 메시지를 전송합니다.
   * @param embeds Discord Embed 배열
   */
  async sendMessage(embeds: DiscordEmbed[]): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.warn('DISCORD_REPORT_WEBHOOK이 설정되지 않았습니다.');
      return false;
    }
    try {
      await axios.post(this.webhookUrl, { embeds });
      return true;
    } catch (error) {
      this.logger.error('Discord 메시지 전송 실패', error);
      return false;
    }
  }
}
