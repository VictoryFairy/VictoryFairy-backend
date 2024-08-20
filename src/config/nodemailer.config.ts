import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const nodeMailerConfig = (configService: ConfigService) => {
  const fromAddress = configService.get('MAIL_FROM');
  const [account, mail] = fromAddress.split('@');
  return nodemailer.createTransport({
    host: `smtp.${mail}`,
    port: 587,
    secure: false,
    auth: {
      user: account,
      pass: configService.get<string>('MAIL_PW'),
    },
  });
};
