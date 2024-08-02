import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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
        text: `인증 코드: ${code}`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
