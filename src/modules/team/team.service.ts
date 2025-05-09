import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Team } from 'src/modules/team/entities/team.entity';
import {
  ITeamRepository,
  TEAM_REPOSITORY,
} from './repository/team.repository.interface';

@Injectable()
export class TeamService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepo: ITeamRepository,
  ) {}

  async findOne(id: number): Promise<Team> {
    const team = await this.teamRepo.findOne({ id });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} is not found`);
    }
    return team;
  }

  async findAll(name?: string): Promise<Team[]> {
    return await this.teamRepo.find(name);
  }

  async findOneByNameOrCreate(name: string): Promise<Team> {
    let team = await this.findOneByName(name);

    if (!team) {
      team = new Team();
      team.name = name;
      await this.teamRepo.save(team);
    }

    return team;
  }

  async findOneByName(name: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ name });

    return team;
  }
}
