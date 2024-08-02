import {
  Controller,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AwsS3Service } from 'src/services/aws-s3.service';

@Controller('s3-store')
@ApiTags('S3-store')
export class AwsS3Controller {
  constructor(private readonly awsS3Service: AwsS3Service) {}

  /** 프로필 사진 s3에 업로드하고 이미지 url 반환 */
  @Post('profile')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    schema: {
      properties: {
        profileImgUrl: { type: 'string' },
      },
    },
  })
  async uploadProfileImg(@UploadedFile() file: Express.Multer.File) {
    const profileImgUrl = await this.awsS3Service.uploadProfile(
      file.buffer,
      file.mimetype,
    );
    return { profileImgUrl };
  }
}
