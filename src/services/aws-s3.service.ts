import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid4 } from 'uuid';

@Injectable()
export class AwsS3Service {
  constructor(
    private readonly configService: ConfigService,
    @Inject('S3_CLIENT')
    private readonly s3Client: S3Client,
  ) {}

  async uploadProfile(file: Buffer, mimeType: string) {
    const { region, bucketName } = this.getEnv();
    const uploadName = `profile/${uuid4()}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uploadName,
      Body: file,
      ContentType: mimeType,
    });
    await this.s3Client.send(command);
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uploadName}`;
    return fileUrl;
  }

  /** 환경변수 게터 함수 */
  private getEnv() {
    const region = this.configService.get<string>('AWS_S3_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    return { region, bucketName };
  }
}
