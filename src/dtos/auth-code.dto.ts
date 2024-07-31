import { IsNumber } from 'class-validator';

export class AuthCodeDto {
  @IsNumber()
  code: number;
}
