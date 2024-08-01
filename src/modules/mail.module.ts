import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from 'src/services/mail.service';

@Module({
  providers: [
    MailService,
    {
      provide: 'MAIL_TRANSPORTER',
      useFactory: (configService: ConfigService) => {
        return nodemailer.createTransport({
          host: 'smtp.naver.com',
          port: 587,
          secure: false,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PW'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
