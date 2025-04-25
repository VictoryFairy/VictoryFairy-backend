import { FindOptionsWhere } from 'typeorm';
import { TeamSelectIdDto } from '../dto/internal/Team-select-id.dto';
import { Team } from '../entities/team.entity';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');
export interface ITeamRepository {
  findAndSelectTeamId(): Promise<TeamSelectIdDto[]>;
  findOne(where: FindOptionsWhere<Team>): Promise<Team>;
  find(name?: string): Promise<Team[]>;
  save(team: Team): Promise<Team>;
}
