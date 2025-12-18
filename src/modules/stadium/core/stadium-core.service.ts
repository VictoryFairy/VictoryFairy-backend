import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Stadium } from './domain/stadium.entity';

@Injectable()
export class StadiumCoreService {
  constructor(
    @InjectRepository(Stadium)
    private readonly stadiumRepository: Repository<Stadium>,
  ) {}

  async findOne(id: number): Promise<Stadium> {
    const stadium = await this.stadiumRepository.findOne({
      where: { id },
    });
    if (!stadium) {
      throw new NotFoundException(`Stadium with id ${id} is not found`);
    }
    return stadium;
  }

  async findByName(name: string): Promise<Stadium | null> {
    const stadium = await this.stadiumRepository.findOne({
      where: { name },
    });
    return stadium;
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

  async upsert(name: string, em?: EntityManager): Promise<Stadium> {
    const repo = em ? em.getRepository(Stadium) : this.stadiumRepository;
    await repo.upsert(
      {
        name: name,
        full_name: '등록되어 있지 않은 경기장',
        latitude: 0,
        longitude: 0,
      },
      ['name'],
    );
    const newStadium = await repo.findOne({ where: { name: name } });
    return newStadium;
  }
}
