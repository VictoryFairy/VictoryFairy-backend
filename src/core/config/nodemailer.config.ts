import * as aws from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const nodeMailerConfig = (
  configService: ConfigService,
): nodemailer.Transporter => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  const port = isProduction ? 465 : 587;
  //  운영 환경에서는 aws ses 사용
  if (isProduction) {
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: 'ap-northeast-2',
      credentials: {
        accessKeyId: configService.get('AWS_SES_ACCESS_KEY'),
        secretAccessKey: configService.get('AWS_SES_SECRET_ACCESS_KEY'),
      },
    });
    return nodemailer.createTransport({
      SES: { ses, aws },
    });
  } else {
    // 개발 환경에서는 개인 메일로 보내는 방식
    const fromAddress = configService.get('MAIL_FROM');
    const mail = fromAddress.split('@')[1] || null;
    return nodemailer.createTransport({
      host: `smtp.${mail}`,
      port,
      secure: isProduction,
      auth: {
        user: fromAddress,
        pass: configService.get<string>('MAIL_PW'),
      },
      pool: true,
      maxConnections: 1,
    });
  }
};
