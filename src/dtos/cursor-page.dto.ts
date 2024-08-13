import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInstance,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

@Exclude()
export class CursorPageMetaDto {
  @ApiPropertyOptional()
  @IsNumber()
  @Expose()
  take: number = 5;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  hasNextData: boolean;

  @ApiProperty()
  @IsNumber()
  @Expose()
  cursor: number;
}

@Exclude()
export class CursorPageDto<T> {
  @ApiProperty()
  @IsArray()
  @Expose()
  data: T[];

  @ApiProperty()
  @IsInstance(CursorPageMetaDto)
  @Expose()
  meta: CursorPageMetaDto;
}

@Exclude()
export class CursorPageOptionDto {
  @ApiPropertyOptional({ default: 5 })
  @IsNumber()
  @Expose()
  take: number = 5;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Expose()
  cursor?: number;
}

@Exclude()
export class CursorPageWithSearchOptionDto extends CursorPageOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Expose()
  q?: string;
}
