import { ApiProperty } from '@nestjs/swagger';

export class ResCheckPwDto {
  @ApiProperty()
  isCorrect: boolean;

  static getExamples() {
    return {
      incorrect: {
        summary: '비밀번호 불일치',
        value: { isCorrect: false },
      },
      correct: {
        summary: '비밀번호 일치',
        value: { isCorrect: true },
      },
    };
  }
}
