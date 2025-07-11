import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { StadiumDto } from '../../stadium/dto/stadium.dto';
import { TeamDto } from '../../team/dto/response/res-team.dto';
import { getGameType } from 'src/common/utils/getGameType';

@Exclude()
export class GameDto {
  @ApiProperty({
    description: '경기 ID',
    example: '20240801SSLG0',
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
    example: '경기종료',
  })
  @IsString()
  @Expose()
  status: string;

  @ApiProperty({
    description: '경기 타입 (0: 일반, 1: DH1, 2: DH2)',
    example: 0,
  })
  @Transform(({ obj }) => getGameType(obj.id))
  @IsNumber()
  @Expose()
  gameType: number;

  @ApiProperty({
    description: '홈 팀 정보',
    example: {
      id: 7,
      name: 'LG',
    },
  })
  @Type(() => TeamDto)
  @ValidateNested()
  @Expose()
  @Transform(({ obj }) => obj.home_team)
  homeTeam: TeamDto;

  @ApiProperty({
    description: '어웨이 팀 정보',
    example: {
      id: 4,
      name: '삼성',
    },
  })
  @Type(() => TeamDto)
  @ValidateNested()
  @Expose()
  @Transform(({ obj }) => obj.away_team)
  awayTeam: TeamDto;

  @ApiProperty({
    description: '경기가 이루어진 경기장 정보',
    example: {
      id: 1,
      name: '잠실',
      latitude: 0,
      longitude: 0,
      address: 'no address',
    },
  })
  @Type(() => StadiumDto)
  @ValidateNested()
  @Expose()
  stadium: StadiumDto;

  @ApiPropertyOptional({
    description: '홈 팀 점수',
    example: 0,
  })
  @IsNumber()
  @Expose()
  @Transform(({ obj }) => obj.home_team_score)
  homeTeamScore?: number;

  @ApiPropertyOptional({
    description: '어웨이 팀 점수',
    example: 7,
  })
  @IsNumber()
  @Expose()
  @Transform(({ obj }) => obj.away_team_score)
  awayTeamScore?: number;

  @ApiPropertyOptional({
    description: '승리 팀 정보',
    example: {
      id: 4,
      name: '삼성',
    },
  })
  @ValidateNested()
  @Expose()
  @Transform(({ obj }) => obj.winning_team)
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
