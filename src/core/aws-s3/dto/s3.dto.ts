import { IsEnum, IsNotEmpty, IsNumber, IsString, Max } from 'class-validator';
import { ImgFileType, S3_MAX_FILE_SIZE } from '../const/s3.const';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlDto {
  @ApiProperty({
    description: '파일 이름',
    example: 'my-profile-image.jpg',
  })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({
    description: '파일 타입 - 선택가능 목록 스키마 확인 필요',
    example: 'image/jpeg ',
    enum: ImgFileType,
  })
  @IsNotEmpty()
  @IsEnum(ImgFileType, { message: '파일 타입이 올바르지 않습니다.' })
  fileType: ImgFileType;

  @ApiProperty({
    description: '파일 크기',
    example: 1024,
  })
  @IsNotEmpty()
  @IsNumber()
  @Max(S3_MAX_FILE_SIZE, { message: '파일 크기가 너무 큽니다.' })
  size: number;
}
