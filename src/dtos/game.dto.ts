import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import { IsNumber, IsString } from "class-validator";
import { Stadium } from "src/entities/stadium.entity";
import { Team } from "src/entities/team.entity";

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
  homeTeam: Team;

  @ApiProperty()
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.away_team)
  awayTeam: Team;

  @ApiProperty()
  @IsNumber()
  @Expose()
  stadium: Stadium;

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
  winningTeam?: Team;
}
