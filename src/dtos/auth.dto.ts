import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenResDto {
  @ApiProperty()
  acToken: string;
  @ApiProperty()
  teamId: number;
  @ApiProperty()
  teamName: string;
}

export class PidReqDto {
  @ApiProperty({ example: '0195cd96-253c-7ffc-bfb4-88dcea935daa' })
  pid: string;
}
