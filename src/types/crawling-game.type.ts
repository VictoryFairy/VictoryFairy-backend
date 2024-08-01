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
  | '광주'
  | '울산';

export type TGameStatus = '경기 전' | '우천취소' | '경기 종료';

export type TGameSchedule = IGameData[];

export interface IGameData {
  id: string;
  date: string;
  time: string;
  // game: string;
  // review: string;
  stadium: TStadium;
  status: TGameStatus;
  homeTeam: TTeam;
  awayTeam: TTeam;
  winner?: TTeam;
  homeScore?: number;
  awayScore?: number;
}
export interface ITeamAndScore {
  name: TTeam;
  score: number | null;
}

/* Raw Data */
/**
 * rows의 연속한 5개의 원소 중 가장 처음 원소는 rows에 "Class": "day"인 필드가 있어서 길이가 9
 * 나머지 원소는 이것이 없어서 길이가 8
 * 순서대로
 * 0. 날짜 (위의 전자에 해당하는 원소)
 * 1. 시간
 * 2. 경기: 경기에 참가하는 팀과 스코어 및 html class로 승패도 나타내고 있음 ['win', 'lose', 'same']
 * 3. 게임센터: 리뷰로의 링크 버튼
 * 4. 하이라이트: 하이라이트로의 링크 버튼
 * 5. TV: 중계를 제공하는 곳
 * 6. 라디오: 라디오 중계를 제공하는 곳인가? 잘 모르겠음
 * 7. 구장: 경기가 실시되는 구장 이름
 * 8. 비고: 주로 경기가 취소 되었을 때 이유를 나타내는 듯?
 */

export interface IRawScheduleList {
  colgroup: unknown[];
  header: unknown[];
  rows: IRows[];
  tfoot: unknown[];
  totalCnt: unknown;
  headerClass: unknown;
  tbodyClass: unknown;
  title: unknown;
  caption: unknown;
  result_cd: unknown;
  result_msg: unknown;
  code: unknown;
  msg: unknown;
}

interface IRows {
  row: IRow[];
  Class: TClass;
  OnClick: unknown;
  Style: unknown;
  Value: unknown;
  Id: unknown;
}

interface IRow {
  Text: string;
  Class: string;
  Scope: unknown;
  RowSpan: string | null;
  ColSpan: string | null;
  Width: unknown;
  TypeObj: unknown;
}

type TClass = 'day' | 'time' | 'play' | 'relay' | null;