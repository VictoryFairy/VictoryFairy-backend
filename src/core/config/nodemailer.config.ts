import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const nodeMailerConfig = (configService: ConfigService) => {
  const nodeEnv = configService.get('NODE_ENV');
  const fromAddress = configService.get('MAIL_FROM');
  const mail = fromAddress.split('@')[1] || null;

  const port = nodeEnv === 'production' ? 465 : 587;
  return nodemailer.createTransport({
    host: `smtp.${mail}`,
    port,
    secure: nodeEnv === 'production',
    auth: {
      user: fromAddress,
      pass: configService.get<string>('MAIL_PW'),
    },
    pool: true,
    maxConnections: 1,
  });
};
