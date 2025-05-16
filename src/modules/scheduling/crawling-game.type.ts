export const TTeam = {
  롯데: '롯데 자이언츠',
  두산: '두산 베어스',
  KIA: 'KIA 타이거즈',
  삼성: '삼성 라이온즈',
  SSG: 'SSG 랜더스',
  NC: 'NC 다이노스',
  LG: 'LG 트윈스',
  키움: '키움 히어로즈',
  KT: 'KT 위즈',
  한화: '한화 이글스',
  나눔: '나눔',
  드림: '드림',
} as const;

export type TTeam = (typeof TTeam)[keyof typeof TTeam];

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
  | '대전(신)';

export type TGameStatus = '경기전' | '경기종료';

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
