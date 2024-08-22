import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const nodeMailerConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get('NODE_ENV');
  const fromAddress = configService.get('MAIL_FROM');
  const [account, mail] = fromAddress.split('@');

  const port = nodeEnv === 'production' ? 465 : 587;
  return nodemailer.createTransport({
    host: `smtp.${mail}`,
    port,
    secure: nodeEnv === 'production',
    auth: {
      user: account,
      pass: configService.get<string>('MAIL_PW'),
    },
  });
};
