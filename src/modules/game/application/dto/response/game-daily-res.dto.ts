import { ApiProperty } from '@nestjs/swagger';
import { GameResDto } from './game-res.dto';

export class GameDailyResDto {
  @ApiProperty({ description: '경기 데이터' })
  games: Record<string, GameResDto[]>;

  @ApiProperty({ description: '유저가 등록한 경기 ID 목록' })
  registeredGameIds: string[];

  static swaggerExample() {
    return {
      games: {
        WOLG: [
          {
            id: '20250513WOLG0',
            date: '2025-05-13',
            time: '18:30:00',
            status: '경기종료',
            gameType: 0,
            homeTeam: {
              id: 7,
              name: 'LG 트윈스',
            },
            awayTeam: {
              id: 8,
              name: '키움 히어로즈',
            },
            stadium: {
              id: 1,
              name: '잠실',
              fullName: '잠실종합운동장잠실야구장',
              latitude: 37.511985800000055,
              longitude: 127.0676545539383,
            },
            homeTeamScore: 9,
            awayTeamScore: 6,
            winningTeam: {
              id: 7,
              name: 'LG 트윈스',
            },
          },
        ],
        NCSK: [
          {
            id: '20250513NCSK0',
            date: '2025-05-13',
            time: '18:30:00',
            status: '경기종료',
            gameType: 0,
            homeTeam: {
              id: 5,
              name: 'SSG 랜더스',
            },
            awayTeam: {
              id: 6,
              name: 'NC 다이노스',
            },
            stadium: {
              id: 6,
              name: '문학',
              fullName: '랜더스 필드',
              latitude: 37.4370423,
              longitude: 126.6932617,
            },
            homeTeamScore: 6,
            awayTeamScore: 3,
            winningTeam: {
              id: 5,
              name: 'SSG 랜더스',
            },
          },
        ],
        LTHT: [
          {
            id: '20250513LTHT0',
            date: '2025-05-13',
            time: '18:30:00',
            status: '경기종료',
            gameType: 0,
            homeTeam: {
              id: 3,
              name: 'KIA 타이거즈',
            },
            awayTeam: {
              id: 1,
              name: '롯데 자이언츠',
            },
            stadium: {
              id: 9,
              name: '광주',
              fullName: '광주기아챔피언스필드',
              latitude: 35.16820922209541,
              longitude: 126.88911206152956,
            },
            homeTeamScore: 4,
            awayTeamScore: 1,
            winningTeam: {
              id: 3,
              name: 'KIA 타이거즈',
            },
          },
        ],
        OBHH: [
          {
            id: '20250513OBHH0',
            date: '2025-05-13',
            time: '18:30:00',
            status: '경기종료',
            gameType: 0,
            homeTeam: {
              id: 10,
              name: '한화 이글스',
            },
            awayTeam: {
              id: 2,
              name: '두산 베어스',
            },
            stadium: {
              id: 10,
              name: '대전',
              fullName: '대전 한화생명 볼파크',
              latitude: 36.3467,
              longitude: 127.3874,
            },
            homeTeamScore: 3,
            awayTeamScore: 4,
            winningTeam: {
              id: 2,
              name: '두산 베어스',
            },
          },
        ],
        KTSS: [
          {
            id: '20250513KTSS0',
            date: '2025-05-13',
            time: '18:30:00',
            status: '경기종료',
            gameType: 0,
            homeTeam: {
              id: 4,
              name: '삼성 라이온즈',
            },
            awayTeam: {
              id: 9,
              name: 'KT 위즈',
            },
            stadium: {
              id: 13,
              name: '포항',
              fullName: '등록되어 있지 않은 경기장',
              latitude: 0,
              longitude: 0,
            },
            homeTeamScore: 5,
            awayTeamScore: 3,
            winningTeam: {
              id: 4,
              name: '삼성 라이온즈',
            },
          },
        ],
      },
      registeredGameIds: ['20240801SSLG0'],
    };
  }
}
