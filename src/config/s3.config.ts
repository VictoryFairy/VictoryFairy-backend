import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const s3Config = (configService: ConfigService) => {
  return new S3Client({
    region: configService.get<string>('AWS_S3_REGION'),
    credentials: {
      accessKeyId: configService.get('AWS_S3_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_S3_SECRET_ACCESS_KEY'),
    },
  });
};
