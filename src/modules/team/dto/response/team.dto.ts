import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseInternalDto } from 'src/shared/dtos/base-internal-dto';

@Exclude()
export class TeamDto extends BaseInternalDto {
  @ApiProperty({
    description: '팀 ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty({
    description: '팀 이름',
    example: '롯데 자이언츠',
  })
  @IsNotEmpty()
  @IsString()
  @Expose()
  name: string;
}
