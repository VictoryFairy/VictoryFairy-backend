import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(
    @Inject('MAIL_TRANSPORTER')
    private readonly mailerService: nodemailer.Transporter,
    private readonly configService: ConfigService,
  ) {}

  async sendAuthCodeMail(email: string, code: string): Promise<boolean> {
    try {
      const fromAddress = this.configService.get('MAIL_FROM');
      await this.mailerService.sendMail({
        from: `승리요정 <${fromAddress}>`,
        to: email,
        subject: '승리요정 인증 코드 번호입니다.',
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
      <!DOCTYPE html>
      <html lang="ko">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>승리 요정 인증 코드</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #fff; color: #333; line-height: 1.6; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.1); text-align: center;">
              <div style="text-align: center; padding-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px; color: #333;">승리 요정 인증 코드</h1>
              </div>
              <p>안녕하세요.</p>
              <p>요청하신 인증 코드는 아래와 같습니다.</p>
              <div style="display: inline-block; padding: 15px 30px; font-size: 24px; font-weight: bold; color: #fff; background-color: #007BFF; border-radius: 8px; margin: 20px 0; text-align: center;">
                  ${code}
              </div>
              <p>이 코드는 <span style="color: #FF0000;">3분</span> 동안 유효합니다.</p>
              <p>감사합니다.</p>
          </div>
      </body>
      </html>`;
  }
}
