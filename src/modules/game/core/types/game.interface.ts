import { Game } from '../domain/game.entity';
import { Team } from 'src/modules/team/core/domain/team.entity';
import { Stadium } from 'src/modules/stadium/core/domain/stadium.entity';

/** Game + home_team, away_team, winning_team 관계가 로드된 상태 */
export interface GameWithTeams extends Game {
  home_team: Team;
  away_team: Team;
  winning_team: Team | null;
}

/** Game + home_team, away_team, winning_team, stadium 관계가 로드된 상태 */
export interface GameWithTeamsAndStadium extends Game {
  home_team: Team;
  away_team: Team;
  winning_team: Team | null;
  stadium: Stadium;
}

/** 경기 점수 업데이트 입력 데이터 */
export interface UpdateGameScoreInput {
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
}
