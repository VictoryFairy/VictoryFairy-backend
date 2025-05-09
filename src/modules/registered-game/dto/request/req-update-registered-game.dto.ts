import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRegisteredGameDto {
  @IsNumber()
  cheeringTeamId: number;

  @IsString()
  seat: string;

  @IsString()
  review: string;

  @IsOptional()
  image?: string;
}
