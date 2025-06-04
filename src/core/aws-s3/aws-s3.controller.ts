import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AwsS3Service } from 'src/core/aws-s3/aws-s3.service';
import { S3Category } from './const/s3.const';
import { PresignedUrlDto } from './dto/s3.dto';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';

@Controller('s3-store')
@ApiTags('S3-store')
export class AwsS3Controller {
  constructor(private readonly awsS3Service: AwsS3Service) {}

  /** 프로필 사진 s3에 업로드하고 이미지 url 반환 */
  @Post('profile')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
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

  @Post('registered-game')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: '직관 이미지 업로드' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    schema: {
      properties: {
        registeredGameImgUrl: { type: 'string' },
      },
    },
  })
  async uploadRegisteredGameImg(@UploadedFile() file: Express.Multer.File) {
    const registeredGameImgUrl = await this.awsS3Service.uploadRegisteredGame(
      file.buffer,
      file.mimetype,
    );
    return { registeredGameImgUrl };
  }

  /**
   * @description s3 업로드를 위한 pre-signed url 발급
   */
  @ApiOperation({
    summary: '[엑세스 토큰 필요] 이미지 업로드 presigned-url 반환',
  })
  @ApiParam({
    name: 'category',
    enum: S3Category,
    description: '업로드할 이미지 카테고리',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    schema: { properties: { presignedUrl: { type: 'string' } } },
  })
  @ApiBody({ type: PresignedUrlDto })
  @ApiBadRequestResponse({
    description: '필수 필드가 없거나, 파일 크기가 제한보다 큰 경우',
  })
  @ApiInternalServerErrorResponse({
    description: 'presigned-url 발급 실패',
  })
  @JwtAuth('access')
  @Post('presigned-url/:category')
  async getPresignedUrl(
    @Param('category', new ParseEnumPipe(S3Category)) category: S3Category,
    @Body() body: PresignedUrlDto,
  ) {
    const { fileType } = body;
    const presignedUrl = await this.awsS3Service.createPresignedUrl(
      category,
      fileType,
    );
    return { presignedUrl };
  }
}
