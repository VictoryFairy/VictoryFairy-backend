import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class IsLikedDto {
  @ApiProperty({
    description: '해당 ID의 응원가의 좋아요 수',
    example: false,
  })
  @Expose()
  isLiked: boolean;
}

@Exclude()
export class LikeCountDto {
  @ApiProperty({
    description: '해당 ID의 응원가의 좋아요 수',
    example: 1,
  })
  @Expose()
  count: number;
}
