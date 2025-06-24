import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { IDotenv } from './dotenv.interface';

export const s3Config = (configService: ConfigService<IDotenv>) => {
  return new S3Client({
    region: configService.get('AWS_S3_REGION', { infer: true }) || '',
    credentials: {
      accessKeyId:
        configService.get('AWS_S3_ACCESS_KEY_ID', { infer: true }) || '',
      secretAccessKey:
        configService.get('AWS_S3_SECRET_ACCESS_KEY', {
          infer: true,
        }) || '',
    },
  });
};
