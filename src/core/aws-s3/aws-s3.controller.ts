import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
} from '@nestjs/common';
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
    const { fileType, size } = body;
    const presignedUrl = await this.awsS3Service.createPresignedUrl(
      category,
      fileType,
      size,
    );
    return { presignedUrl };
  }
}
