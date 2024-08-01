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
        const stadium = new Stadium();
        stadium.name = seed.name;
        stadium.address = 'no address';
        stadium.latitude = 0;
        stadium.longitude = 0;
        return manager.save(stadium);
      });

      await Promise.all(savePromises);
    });
  }

  async findByName(name: string): Promise<Stadium> {
    return this.stadiumRepository.findOneBy({
      name: name,
    });
  }

  async findByNameOrCreate(name: string): Promise<Stadium> {
    let stadium = await this.stadiumRepository.findOneBy({ name: name });

    if (!stadium) {
        stadium = new Stadium();
        stadium.name = name;
        stadium.address = 'no address';
        stadium.latitude = 0;
        stadium.longitude = 0;
        await this.stadiumRepository.save(stadium);
    }

    return stadium;
  }

  async findByNames(names: string[]): Promise<Stadium[]> {
    return this.stadiumRepository.findBy({
      name: In(names),
    })
  }
}
