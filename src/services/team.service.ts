import { Injectable } from '@nestjs/common';
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
    await this.teamRepository.manager.transaction(async manager => {
      const savePromises = teamSeeder.map(seed => {
        const team = new Team();
        team.name = seed.name;
        return manager.save(team);
      });

      await Promise.all(savePromises);
    });
  }

  findByName(name: string): Promise<Team> {
    return this.teamRepository.findOneBy({
      name: name,
    });
  }

  findByNames(names: string[]): Promise<Team[]> {
    return this.teamRepository.findBy({
      name: In(names),
    })
  }
}
