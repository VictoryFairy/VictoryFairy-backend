import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(email: string) {
    await this.mailerService.sendMail({
      to: `${email}`,
      subject: 'Test',
      text: '테스트',
    });
  }
}
