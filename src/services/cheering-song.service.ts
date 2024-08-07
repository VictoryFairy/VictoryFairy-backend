import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { cheeringSongSeeder } from 'src/seeds/cheering-song.seed';
import { Repository } from 'typeorm';

@Injectable()
export class CheeringSongService {
  constructor(
    @InjectRepository(CheeringSong)
    private readonly cheeringSongRepository: Repository<CheeringSong>,
  ) {}

  async seed() {
    await this.cheeringSongRepository.manager.transaction(async (manager) => {
      const savePromises = cheeringSongSeeder.map((seed) => {
        const cheeringSong = new CheeringSong();
        cheeringSong.title = seed.title;
        cheeringSong.lyric = seed.lyric;
        cheeringSong.link = seed.link;
        return manager.save(cheeringSong);
      });

      await Promise.all(savePromises);
    });
  }

  async findOne(id: number): Promise<CheeringSong> {
    const team = await this.cheeringSongRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Team with id ${id} is not found`);
    }
    return team;
  }

  async findAll(): Promise<CheeringSong[]> {
    return await this.cheeringSongRepository.find();
  }
}
