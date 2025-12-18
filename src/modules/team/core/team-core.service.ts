import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { Team } from './domain/team.entity';

@Injectable()
export class TeamCoreService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async findOne(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} is not found`);
    }
    return team;
  }

  async findAll(name?: string): Promise<Team[]> {
    const whereCondition = name
      ? { id: Between(1, 10), name }
      : { id: Between(1, 10) };
    return await this.teamRepository.find({ where: whereCondition });
  }

  async findOneByName(name: string): Promise<Team | null> {
    const team = await this.teamRepository.findOne({ where: { name } });
    return team;
  }

  async findOneByNameOrCreate(name: string): Promise<Team> {
    let team = await this.findOneByName(name);
    if (!team) {
      team = new Team();
      team.name = name;
      await this.teamRepository.save(team);
    }
    return team;
  }

  async upsert(teamName: string, em?: EntityManager): Promise<Team> {
    const repo = em ? em.getRepository(Team) : this.teamRepository;
    await repo.upsert({ name: teamName }, ['name']);
    const newTeam = await repo.findOne({ where: { name: teamName } });
    return newTeam;
  }

  async save(team: Team): Promise<Team> {
    return await this.teamRepository.save(team);
  }
}
