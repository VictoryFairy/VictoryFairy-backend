import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';

Exclude();
export class DeleteImageAwsS3Dto {
  @ApiProperty({
    description: '이미지 파일 URL',
    example:
      'https://sngyo.s3.ap-northeast-2.amazonaws.com/profile/d8c40c8b-13ed-44d6-9bc2-0a858b6f8625-1723186034811',
  })
  @IsString()
  @Expose()
  fileUrl: string;
}
