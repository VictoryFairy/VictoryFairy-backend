import { Module } from '@nestjs/common';
import { MailService } from '../services/mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('MAIL_USER');
        const pass = configService.get<string>('MAIL_PW');
        const from = configService.get<string>('MAIL_FROM');
        return {
          transport: {
            host: 'smtp.naver.com',
            port: 587,
            auth: {
              user,
              pass,
            },
          },
          defaults: {
            from: `승리요정 인증코드 <${from}>`,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MailService],
  providers: [MailService],
})
export class MailModule {}
