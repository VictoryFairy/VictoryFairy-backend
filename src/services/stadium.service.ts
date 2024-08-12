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
      for (const seed of stadiumSeeder) {
        await manager.getRepository(Stadium).upsert({
          name: seed.name,
          full_name: seed.full_name,
          latitude: seed.lat,
          longitude: seed.lng,
        }, ['name']);
      }
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
    let stadium = await this.findByName(name);

    if (!stadium) {
      stadium = new Stadium();
      stadium.name = name;
      stadium.full_name = '등록되어 있지 않은 경기장';
      stadium.latitude = 0;
      stadium.longitude = 0;
      await this.stadiumRepository.save(stadium);
    }

    return stadium;
  }

  async findByName(name: string): Promise<Stadium> {
    const stadium = await this.stadiumRepository.findOne({
      where: { name },
    });
    return stadium;
  }
}
