import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IDotenv } from '../config/dotenv.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isProduction: boolean;
  private readonly fromAddress: string;
  constructor(
    @Inject('MAIL_TRANSPORTER')
    private readonly mailTransporter: nodemailer.Transporter,
    private readonly configService: ConfigService<IDotenv>,
  ) {
    this.isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
    this.fromAddress = this.isProduction
      ? this.configService.get('AWS_SES_FROM_ADDRESS', { infer: true })
      : this.configService.get('MAIL_FROM', { infer: true });
  }

  async sendAuthCodeMail(email: string, code: string): Promise<boolean> {
    try {
      await this.mailTransporter.sendMail({
        from: `"승리요정" <${this.fromAddress}>`,
        to: email,
        subject: '[승리요정] 인증번호 안내드립니다',
        text: `안녕하세요. 요청하신 인증번호는 ${code}입니다. 3분간 유효합니다.`,
        html: this.generateHtmlTemplate(code),
      });
      return true;
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return false;
    }
  }

  private generateHtmlTemplate(code: string): string {
    return `
    <p style="font-size: 16px;">
      안녕하세요.<br/>
      요청하신 인증번호는 아래와 같습니다:
    </p>
    <p style="font-size: 20px; font-weight: bold; color: #007BFF;">
      ${code}
    </p>
    <p style="font-size: 16px;">
      해당 코드는 3분간 유효합니다.<br/>
      감사합니다.
    </p>`;
  }
}
