import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nodeMailerConfig } from 'src/config/nodemailer.config';
import { MailService } from 'src/infra/mail/mail.service';
import { IDotenv } from '../../config/dotenv.interface';

@Module({
  providers: [
    MailService,
    {
      provide: 'MAIL_TRANSPORTER',
      useFactory: (configService: ConfigService<IDotenv>) =>
        nodeMailerConfig(configService),
      inject: [ConfigService<IDotenv>],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
