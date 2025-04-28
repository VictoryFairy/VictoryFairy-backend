import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class ResRankDto {
  @ApiProperty({ example: 1 })
  @Expose()
  rank: number;

  @ApiProperty({ example: 1025 })
  @Expose()
  score: number;

  @ApiProperty({ example: 'imagefadfafa' })
  @Expose()
  @Transform(({ obj }) => obj.profile_image ?? obj.image)
  image: string;

  @ApiProperty({ example: 'test1' })
  @Expose()
  nickname: string;

  @ApiProperty({ example: 2 })
  @Expose()
  @Transform(({ obj }) => obj.user_id ?? obj.userId)
  userId: number;
}
