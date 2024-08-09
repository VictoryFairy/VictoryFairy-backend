import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { TeamDto } from './team.dto';
import { StadiumDto } from './stadium.dto';

@Exclude()
export class GameDto {
  @ApiProperty({
    description: '경기 ID',
    example: '20240801SSLG0'
  })
  @IsNumber()
  @Expose()
  id: string;

  @ApiProperty({
    description: '경기 일자',
    example: '2024-08-01',
  })
  @IsString()
  @Expose()
  date: string;

  @ApiProperty({
    description: '경기 시작 시간',
    example: '18:30:00',
  })
  @IsString()
  @Expose()
  time: string;

  @ApiProperty({
    description: '경기 상태',
    example: '경기 종료',
  })
  @IsString()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.home_team)
  homeTeam: TeamDto;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.away_team)
  awayTeam: TeamDto;

  @ApiProperty()
  @Expose()
  stadium: StadiumDto;

  @ApiPropertyOptional({
    description: '홈 팀 점수',
    example: 0,
  })
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.home_team_score)
  homeTeamScore?: string;

  @ApiPropertyOptional({
    description: '어웨이 팀 점수',
    example: 7,
  })
  @IsString()
  @Expose()
  @Transform(({ obj }) => obj.away_team_score)
  awayTeamScore?: string;

  @ApiPropertyOptional()
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
