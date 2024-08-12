import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class TeamDto {
  @ApiProperty({
    description: '팀 ID',
    example: 1,
  })
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '팀 이름',
    example: '롯데',
  })
  @IsString()
  @Expose()
  name: string;
}
