import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsNotEmpty, IsString } from 'class-validator';

export class TermAgreementDto {
  @ApiProperty({
    type: [String],
    description: '동의할 약관 ID 목록',
    example: ['PRIVACY20250304', 'LOCATION20250302'],
  })
  @IsNotEmpty()
  @ArrayNotEmpty()
  @IsString({ each: true })
  termIds: string[];
}
