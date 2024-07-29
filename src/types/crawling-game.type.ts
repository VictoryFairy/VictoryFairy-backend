export type TTeam =
  | '롯데'
  | '두산'
  | 'KIA'
  | '삼성'
  | 'SSG'
  | 'NC'
  | 'LG'
  | '키움'
  | 'KT'
  | '한화';

export type TStadium =
  | '잠실'
  | '창원'
  | '고척'
  | '대구'
  | '대전'
  | '문학'
  | '수원'
  | '사직'
  | '광주';

export type TGameStatus = '경기 전' | '우천취소' | '경기 종료';

export interface GameSchedule {
  [date: string]: GameData[];
}

export interface GameData {
  time: string;
  // game: string;
  // review: string;
  stadium: TStadium;
  status: TGameStatus;
  homeTeam: TTeam;
  awayTeam: TTeam;
  winner?: 'home' | 'away';
  homeScore?: number;
  awayScore?: number;
}
export interface ITeamAndScore {
  name: TTeam;
  score: number | null;
}