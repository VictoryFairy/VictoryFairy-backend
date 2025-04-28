import { ApiProperty } from '@nestjs/swagger';

export class ResRankRecordDto {
  @ApiProperty({ example: 1 })
  win: number;

  @ApiProperty({ example: 0 })
  lose: number;

  @ApiProperty({ example: 0 })
  tie: number;

  @ApiProperty({ example: 0 })
  cancel: number;

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1005 })
  score: number;
}
