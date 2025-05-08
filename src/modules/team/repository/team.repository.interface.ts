import { FindOptionsWhere } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamSelectIdDto } from '../dto/internal/team-select-id.dto';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');
export interface ITeamRepository {
  findAndSelectTeamId(): Promise<TeamSelectIdDto[]>;
  findOne(where: FindOptionsWhere<Team>): Promise<Team>;
  find(name?: string): Promise<Team[]>;
  save(team: Team): Promise<Team>;
}
