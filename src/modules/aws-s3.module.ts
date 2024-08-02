import { Module } from '@nestjs/common';
import { AwsS3Service } from '../services/aws-s3.service';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

@Module({
  exports: [AwsS3Service],
  providers: [
    AwsS3Service,
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new S3Client({
          region: configService.get<string>('AWS_S3_REGION'),
          credentials: {
            accessKeyId: configService.get('AWS_S3_ACCESS_KEY_ID'),
            secretAccessKey: configService.get('AWS_S3_SECRET_ACCESS_KEY'),
          },
        });
      },
    },
  ],
})
export class AwsS3Module {}
