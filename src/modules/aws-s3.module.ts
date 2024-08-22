import { Module } from '@nestjs/common';
import { AwsS3Service } from '../services/aws-s3.service';
import { ConfigService } from '@nestjs/config';
import { s3Config } from 'src/config/s3.config';
import { AwsS3Controller } from 'src/controllers/aws-s3.controller';

@Module({
  controllers: [AwsS3Controller],
  providers: [
    AwsS3Service,
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService],
      useFactory: s3Config,
    },
  ],
  exports: [AwsS3Service],
})
export class AwsS3Module {}
