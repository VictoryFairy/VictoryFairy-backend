import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenResDto {
  @ApiProperty()
  acToken: string;
  @ApiProperty()
  teamId: number;
  @ApiProperty()
  teamName: string;
}
