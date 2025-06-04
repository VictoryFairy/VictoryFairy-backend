import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { instanceToPlain } from 'class-transformer';
import { DeleteImageAwsS3Dto } from 'src/core/aws-s3/aws-s3.dto';
import { v4 as uuid4, v7 as uuid7 } from 'uuid';
import { ImgFileType, S3_EXPIRES_IN, S3Category } from './const/s3.const';

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name);
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('S3_CLIENT')
    private readonly s3Client: S3Client,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.region = this.configService.get<string>('AWS_S3_REGION');
  }

  async uploadProfile(file: Buffer, mimeType: string) {
    const uploadName = `profile/${uuid4()}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uploadName,
      Body: file,
      ContentType: mimeType,
    });
    const result = await this.s3Client.send(command);
    this.logger.log(
      `Image putting command sent. The result is:\n${instanceToPlain(result)}`,
    );
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uploadName}`;
    return fileUrl;
  }

  async uploadRegisteredGame(file: Buffer, mimeType: string) {
    const uploadName = `registered-game/${uuid4()}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uploadName,
      Body: file,
      ContentType: mimeType,
    });
    const result = await this.s3Client.send(command);
    this.logger.log(
      `Image putting command sent. The result is:\n${instanceToPlain(result)}`,
    );
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uploadName}`;
    return fileUrl;
  }

  async deleteImage(deleteImageAwsS3Dto: DeleteImageAwsS3Dto): Promise<void> {
    const { fileUrl } = deleteImageAwsS3Dto;
    const uploadName = this.extractKeyFromUrl(fileUrl);

    if (!uploadName) return;

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: uploadName,
    });
    const result = await this.s3Client.send(command);
    this.logger.log(
      `Image deleting command sent. The result is:\n${instanceToPlain(result)}`,
    );
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return decodeURIComponent(urlObj.pathname.substring(1));
    } catch (error) {
      this.logger.warn(`${error.name}`);
      return null;
    }
  }

  async createPresignedUrl(category: S3Category, fileType: ImgFileType) {
    const uploadName = `${category}/${uuid7()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uploadName,
      ContentType: fileType,
    });
    try {
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: S3_EXPIRES_IN,
      });
      return presignedUrl;
    } catch (error) {
      throw new InternalServerErrorException('presigned-url 발급 실패');
    }
  }
}
