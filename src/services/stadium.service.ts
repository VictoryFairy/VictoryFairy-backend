import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stadium } from 'src/entities/stadium.entity';
import { stadiumSeeder } from 'src/seeds/stadium.seed';
import { Repository } from 'typeorm';

@Injectable()
export class StadiumService {
  constructor(
    @InjectRepository(Stadium)
    private readonly stadiumRepository: Repository<Stadium>,
  ) {}

  async seed() {
    await this.stadiumRepository.manager.transaction(async (manager) => {
      const savePromises = stadiumSeeder.map((seed) => {
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

  async findOne(id: number): Promise<Stadium> {
    const team = await this.stadiumRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Stadium with id ${id} is not found`);
    }
    return team;
  }

  async findAll(name?: string): Promise<Stadium[]> {
    if (name) {
      return await this.stadiumRepository.find({
        where: { name },
      });
    } else {
      return await this.stadiumRepository.find();
    }
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
}
