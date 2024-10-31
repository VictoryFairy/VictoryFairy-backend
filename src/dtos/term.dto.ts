import { ApiProperty } from '@nestjs/swagger';
import { Term } from 'src/entities/term.entity';

export class TermListResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '이용약관' })
  title: string;

  @ApiProperty({ example: 'fdkjfklajf' })
  content: string;

  @ApiProperty({ example: true, description: '필수/옵션 약관 여부' })
  isRequired: boolean;

  constructor(data: Term) {
    const { id, title, content, is_required } = data;
    Object.assign(this, {
      id,
      title,
      content,
      isRequired: is_required,
    });
  }
}
