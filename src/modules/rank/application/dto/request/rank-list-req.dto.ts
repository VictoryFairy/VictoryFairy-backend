import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class RankListReqDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  teamId?: number;
}

