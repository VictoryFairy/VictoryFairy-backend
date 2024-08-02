import { Module } from '@nestjs/common';
import { AwsS3Service } from '../services/aws-s3.service';
import { ConfigService } from '@nestjs/config';
import { s3Config } from 'src/config/s3.config';

@Module({
  exports: [AwsS3Service],
  providers: [
    AwsS3Service,
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService],
      useFactory: s3Config,
    },
  ],
})
export class AwsS3Module {}
