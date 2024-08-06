import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class CreateRegisteredGameDto {
  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty()
  @IsString()
  seat: string;

  @ApiProperty()
  @IsString()
  review: string;

  @ApiProperty()
  @IsString()
  gameId: string;

  @ApiProperty()
  @IsNumber()
  cheeringTeamId: number;
}

export class UpdateRegisteredGameDto {
  @ApiPropertyOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsString()
  seat?: string;

  @ApiPropertyOptional()
  @IsString()
  review?: string;

  @ApiPropertyOptional()
  @IsNumber()
  cheeringTeamId: number;
}


export class RegisteredGameDto {
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  image: string;

  @ApiProperty()
  @IsString()
  @Expose()
  seat: string;

  @ApiProperty()
  @IsString()
  @Expose()
  review: string;

  @ApiProperty()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.game.id)
  gameId: string;

  @ApiProperty()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.cheering_team.id)
  cheeringTeamId: number;
}
