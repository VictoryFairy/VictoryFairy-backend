import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CheeringSongDto } from 'src/modules/cheering-song/application/dto/cheering-song.dto';

@Exclude()
export class CursorPageMetaDto {
  @ApiPropertyOptional({
    description: '요청한 데이터의 수',
    example: 5,
    default: 5,
  })
  @IsNumber()
  @Expose()
  take: number = 5;

  @ApiProperty({
    description: '다음 데이터가 있는지 여부',
    example: true,
  })
  @IsBoolean()
  @Expose()
  hasNextData: boolean;

  @ApiProperty({
    description: '다음 데이터를 얻기 위해 지정해야하는 커서',
    example: 255,
  })
  @IsNumber()
  @Expose()
  cursor: number;
}

/** 제네릭으로 어떻게 할 수 있지 않을까??? 찾아봤지만 잘 안됨... */
@Exclude()
export class CursorPageCheeringSongDto {
  @ApiProperty({
    description: '데이터의 배열 / 그 길이는 take를 넘지 않음',
  })
  @IsArray()
  @Type(() => CheeringSongDto)
  @ValidateNested()
  @Expose()
  data: CheeringSongDto[];

  @ApiProperty({
    description: '페이지네이션 메타 정보',
  })
  @Type(() => CursorPageMetaDto)
  @ValidateNested()
  @Expose()
  meta: CursorPageMetaDto;
}

@Exclude()
export class CursorPageOptionDto {
  @ApiProperty({
    description: '받을 데이터의 수',
    example: 5,
  })
  @IsNumber()
  @Expose()
  take: number;

  @ApiPropertyOptional({
    description: '커서의 위치 / 기준은 ID 오름차순',
    example: 255,
  })
  @IsOptional()
  @IsNumber()
  @Expose()
  cursor?: number;
}

@Exclude()
export class CursorPageWithSearchOptionDto extends CursorPageOptionDto {
  @ApiPropertyOptional({
    description: '검색할 키워드',
    example: '워어어',
  })
  @IsOptional()
  @IsString()
  @Expose()
  q?: string;
}
