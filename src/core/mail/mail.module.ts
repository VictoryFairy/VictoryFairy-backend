import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nodeMailerConfig } from 'src/core/config/nodemailer.config';
import { MailService } from 'src/core/mail/mail.service';

@Module({
  providers: [
    MailService,
    {
      provide: 'MAIL_TRANSPORTER',
      useFactory: (configService: ConfigService) =>
        nodeMailerConfig(configService),
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
