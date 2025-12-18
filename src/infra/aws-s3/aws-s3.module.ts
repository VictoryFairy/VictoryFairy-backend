import { Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';
import { ConfigService } from '@nestjs/config';
import { s3Config } from 'src/config/s3.config';
import { AwsS3Controller } from 'src/infra/aws-s3/aws-s3.controller';
import { IDotenv } from '../../config/dotenv.interface';

@Module({
  controllers: [AwsS3Controller],
  providers: [
    AwsS3Service,
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService<IDotenv>],
      useFactory: s3Config,
    },
  ],
  exports: [AwsS3Service],
})
export class AwsS3Module {}
