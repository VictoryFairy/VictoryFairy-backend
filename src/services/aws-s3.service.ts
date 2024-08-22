import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteImageAwsS3Dto } from 'src/dtos/aws-s3.dto';
import { v4 as uuid4 } from 'uuid';

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name);

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
    const result = await this.s3Client.send(command);
    this.logger.log(`Image putting command sent. The result is:\n${result}`);
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uploadName}`;
    return fileUrl;
  }

  async uploadRegisteredGame(file: Buffer, mimeType: string) {
    const { region, bucketName } = this.getEnv();
    const uploadName = `registered-game/${uuid4()}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uploadName,
      Body: file,
      ContentType: mimeType,
    });
    const result = await this.s3Client.send(command);
    this.logger.log(`Image putting command sent. The result is:\n${result}`);
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uploadName}`;
    return fileUrl;
  }

  async deleteImage(deleteImageAwsS3Dto: DeleteImageAwsS3Dto): Promise<void> {
    const { bucketName } = this.getEnv();
    const { fileUrl } = deleteImageAwsS3Dto;
    const uploadName = this.extractKeyFromUrl(fileUrl);

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: uploadName,
    });
    const result = await this.s3Client.send(command);
    this.logger.log(`Image deleting command sent. The result is:\n${result}`);
  }

  private extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return decodeURIComponent(urlObj.pathname.substring(1));
  }

  /** 환경변수 게터 함수 */
  private getEnv() {
    const region = this.configService.get<string>('AWS_S3_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    return { region, bucketName };
  }
}
