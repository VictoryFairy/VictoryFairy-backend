import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { TeamDto } from './team.dto';
import { StadiumDto } from './stadium.dto';

@Exclude()
export class GameDto {
  @ApiProperty()
  @IsNumber()
  @Expose()
  id: number;

  @ApiProperty()
  @IsString()
  @Expose()
  date: Date;

  @ApiProperty()
  @IsString()
  @Expose()
  time: string;

  @ApiProperty()
  @IsString()
  @Expose()
  status: string;

  @ApiProperty()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.home_team)
  homeTeam: TeamDto;

  @ApiProperty()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.away_team)
  awayTeam: TeamDto;

  @ApiProperty()
  @IsNumber()
  @Expose()
  stadium: StadiumDto;

  @ApiPropertyOptional()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.home_team_score)
  homeTeamScore?: string;

  @ApiPropertyOptional()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.away_team_score)
  awayTeamScore?: string;

  @ApiPropertyOptional()
  @IsString()
  @Expose()
  winningTeam?: TeamDto;
}

export class FindAllDailyQueryDto {
  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsNumber()
  month: number;

  @ApiProperty()
  @IsNumber()
  day: number;
}
