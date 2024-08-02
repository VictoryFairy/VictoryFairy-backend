import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nodeMailerConfig } from 'src/config/nodemailer.config';
import { MailService } from 'src/services/mail.service';

@Module({
  providers: [
    MailService,
    {
      provide: 'MAIL_TRANSPORTER',
      useFactory: nodeMailerConfig,
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
