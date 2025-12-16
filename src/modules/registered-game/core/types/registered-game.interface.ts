import { RegisteredGame } from '../domain/registered-game.entity';
import { Team } from 'src/modules/team/core/domain/team.entity';
import { User } from 'src/modules/account/core/domain/user.entity';
import { RegisteredGameStatus } from './registered-game-status.type';
import {
  GameWithTeams,
  GameWithTeamsAndStadium,
} from 'src/modules/game/core/types/game.interface';

/** RegisteredGame + game(with teams), cheering_team 관계가 로드된 상태 */
export interface RegisteredGameWithGameAndTeam extends RegisteredGame {
  game: GameWithTeams;
  cheering_team: Team;
}

/** RegisteredGame + game(with teams, stadium), cheering_team 관계가 로드된 상태 */
export interface RegisteredGameWithFullRelations extends RegisteredGame {
  game: GameWithTeamsAndStadium;
  cheering_team: Team;
}

/** RegisteredGame + game(with teams), cheering_team, user 관계가 로드된 상태 */
export interface RegisteredGameWithRelations extends RegisteredGame {
  game: GameWithTeamsAndStadium;
  cheering_team: Team;
  user: User;
}

export interface SaveRegisteredGameInput {
  image: string | null;
  seat: string;
  review: string;
  game: {
    id: string;
    status: string;
    homeTeam: { id: number };
    awayTeam: { id: number };
  };
  cheeringTeam: { id: number };
  userId: number;
}

export interface UpdateRegisteredGameInput {
  cheeringTeamId: number;
  seat: string;
  review: string;
  image?: string;
}

export interface UpdateRegisteredGameResult {
  imageCtx: {
    isChanged: boolean;
    prevImage: string | null;
  };
  teamCtx: {
    isChanged: boolean;
    prevTeamId: number;
    newTeamId: number;
    prevStatus: RegisteredGameStatus | null;
    changedStatus: RegisteredGameStatus | null;
    year: number;
  };
}

export interface DeleteRegisteredGameInput {
  registeredGameId: number;
  userId: number;
}

export interface DeleteRegisteredGameResult {
  imageCtx: {
    prevImage: string | null;
  };
  gameCtx: {
    status: RegisteredGameStatus | null;
    teamId: number;
    year: number;
  };
}
