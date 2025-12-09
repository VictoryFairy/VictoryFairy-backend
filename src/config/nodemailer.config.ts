import * as aws from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IDotenv } from './dotenv.interface';

export const nodeMailerConfig = (
  configService: ConfigService<IDotenv>,
): nodemailer.Transporter => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  const port = isProduction ? 465 : 587;
  //  운영 환경에서는 aws ses 사용
  if (isProduction) {
    const accessKeyId = configService.get('AWS_SES_ACCESS_KEY', {
      infer: true,
    });
    const secretAccessKey = configService.get('AWS_SES_SECRET_ACCESS_KEY', {
      infer: true,
    });
    const region = 'ap-northeast-2';

    const ses = new aws.SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    return nodemailer.createTransport({
      SES: { ses, aws },
    });
  } else {
    // 개발 환경에서는 개인 메일로 보내는 방식
    const fromAddress = configService.get('MAIL_FROM', { infer: true });
    const mail = fromAddress.split('@')[1] || null;
    return nodemailer.createTransport({
      host: `smtp.${mail}`,
      port,
      secure: isProduction,
      auth: {
        user: fromAddress,
        pass: configService.get('MAIL_PW', { infer: true }),
      },
      pool: true,
      maxConnections: 1,
    });
  }
};
