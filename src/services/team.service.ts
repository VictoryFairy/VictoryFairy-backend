import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { teamSeeder } from 'src/seeds/team.seed';
import { In, Repository } from 'typeorm';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async seed() {
    await this.teamRepository.manager.transaction(async (manager) => {
      const savePromises = teamSeeder.map((seed) => {
        const team = new Team();
        team.name = seed.name;
        return manager.save(team);
      });

      await Promise.all(savePromises);
    });
  }

  async findOne(id: number): Promise<Team> {
    const team = this.teamRepository.findOneBy({ id: id });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} is not found`);
    }
    return team;
  }

  async findByName(name: string): Promise<Team> {
    return this.teamRepository.findOneBy({
      name: name,
    });
  }

  async findByNameOrCreate(name: string): Promise<Team> {
    let team = await this.teamRepository.findOneBy({ name: name });

    if (!team) {
      team = new Team();
      team.name = name;
      await this.teamRepository.save(team);
    }

    return team;
  }

  async findByNames(names: string[]): Promise<Team[]> {
    return this.teamRepository.findBy({
      name: In(names),
    });
  }
}
