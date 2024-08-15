import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { TeamDto } from './team.dto';
import { PlayerDto } from './player.dto';
import { CheeringSong } from 'src/entities/cheering-song.entity';

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
    example: `찬란하게 빛날 최강두산 이유찬~ (이유찬!)`,
  })
  @IsString()
  @Expose()
  @Transform(({ obj }: { obj: CheeringSong }) => obj.lyrics.split('\n')[0])
  lyrics_preview: string;

  @ApiProperty({
    description: '응원가 팀',
    example: {
      id: 2,
      name: '두산',
    },
  })
  @Type(() => TeamDto)
  @ValidateNested()
  @Expose()
  team: TeamDto;

  @ApiPropertyOptional({
    description: '선수 응원가의 선수',
  })
  @Type(() => PlayerDto)
  @ValidateNested()
  @Expose()
  player?: PlayerDto;

  @ApiProperty({
    description: '좋아요 여부',
    example: false,
  })
  @IsBoolean()
  @Expose()
  isLiked: boolean;
}

@Exclude()
export class CheeringSongDetailedDto extends OmitType(CheeringSongDto, [
  'lyrics_preview',
]) {
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
