import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Team } from 'src/modules/team/entities/team.entity';
import {
  ITeamRepository,
  TEAM_REPOSITORY,
} from './repository/team.repository.interface';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TeamService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepo: ITeamRepository,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
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

  async save(teamName: string, em?: EntityManager): Promise<Team> {
    const repo = em ? em.getRepository(Team) : this.teamRepository;

    await repo.upsert({ name: teamName }, ['name']);
    const newTeam = await repo.findOne({ where: { name: teamName } });
    return newTeam;
  }
}
