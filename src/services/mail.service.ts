import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendAuthCodeMail(email: string, code: string) {
    try {
      await this.mailerService.sendMail({
        to: `${email}`,
        subject: '승리요정 인증 코드 번호입니다.',
        text: `인증 코드  :  ${code}`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
