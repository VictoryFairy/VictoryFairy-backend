import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

@Exclude()
export class CheeringSongDto {
  @ApiProperty({
    description: '응원가 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '응원가 제목',
    example: '이유찬 응원가',
  })
  @IsString()
  @Expose()
  title: string;

  @ApiProperty({
    description: '응원가 가사',
    example: `찬란하게 빛날 최강두산 이유찬~ (이유찬!)
힘차게 날아올라라!
최강두산 이유찬!x2`,
  })
  @IsString()
  @Expose()
  lyrics: string;

  @ApiProperty({
    description: '응원가 유튜브 링크',
    example: 'https://www.youtube.com/watch?v=u-FtlcrqTxY',
  })
  @IsUrl()
  @Expose()
  link: string;
}
