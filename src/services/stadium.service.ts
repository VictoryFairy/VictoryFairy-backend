import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stadium } from 'src/entities/stadium.entity';
import { stadiumSeeder } from 'src/seeds/stadium.seed';
import { In, Repository } from 'typeorm';

@Injectable()
export class StadiumService {
  constructor(
    @InjectRepository(Stadium)
    private readonly stadiumRepository: Repository<Stadium>,
  ) {}

  async seed() {
    await this.stadiumRepository.manager.transaction(async manager => {
      const savePromises = stadiumSeeder.map(seed => {
        const team = new Stadium();
        team.name = seed.name;
        team.address = 'no address';
        team.latitude = 0;
        team.longitude = 0;
        return manager.save(team);
      });

      await Promise.all(savePromises);
    });
  }

  findByName(name: string): Promise<Stadium> {
    return this.stadiumRepository.findOneBy({
      name: name,
    });
  }

  findByNames(names: string[]): Promise<Stadium[]> {
    return this.stadiumRepository.findBy({
      name: In(names),
    })
  }
}
