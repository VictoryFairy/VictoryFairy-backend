import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { teamSeeder } from 'src/seeds/team.seed';
import { Repository } from 'typeorm';

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
    const team = await this.teamRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} is not found`);
    }
    return team;
  }

  async findAll(name?: string): Promise<Team[]> {
    if (name) {
      return await this.teamRepository.find({
        where: { name },
      });
    } else {
      return await this.teamRepository.find();
    }
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

  async findOneByName(name: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { name },
    });

    return team;
  }
}
