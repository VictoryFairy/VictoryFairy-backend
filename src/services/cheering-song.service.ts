import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { ICheeringSongSeed } from 'src/types/seed.type';
import { Repository } from 'typeorm';
import { TeamService } from './team.service';
import { Player } from 'src/entities/player.entity';

@Injectable()
export class CheeringSongService {
  private readonly logger = new Logger(CheeringSongService.name);

  constructor(
    @InjectRepository(CheeringSong)
    private readonly cheeringSongRepository: Repository<CheeringSong>,
    private readonly teamService: TeamService,
  ) {}

  private readJSONFile(filePath: string): ICheeringSongSeed[] {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as ICheeringSongSeed[];
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  private getCheeringSongData(): ICheeringSongSeed[] {
    const dirPath = 'src/seeds/refined-cheering-songs';

    let combinedData: ICheeringSongSeed[] = [];

    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(dirPath, file);
          const fileData = this.readJSONFile(filePath);
          combinedData = combinedData.concat(fileData);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return combinedData;
  }

  async seed() {
    const cheeringSongSeeder = this.getCheeringSongData();

    await this.cheeringSongRepository.manager.transaction(async (manager) => {
      const savePromises = cheeringSongSeeder.map(async (seed) => {
        const cheeringSong = new CheeringSong();
        cheeringSong.title = seed.title;
        cheeringSong.lyrics = seed.lyrics;
        cheeringSong.link = seed.link;

        const team = await this.teamService.findOneByName(seed.team_name);
        cheeringSong.team = team;

        await manager.save(cheeringSong);

        if (seed.player_name) {
          const player = new Player();
          player.name = seed.player_name;
          player.jersey_number = seed.jersey_number;
          player.position = seed.position;
          player.throws_bats = seed.throws_bats;
          player.team = team;

          cheeringSong.player = player;
          player.cheeringSong = cheeringSong;

          manager.insert(Player, player);
        }
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
