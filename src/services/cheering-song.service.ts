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
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
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
      for (const seed of cheeringSongSeeder) {
        const team = await this.teamService.findOneByName(seed.team_name);
  
        let player: Player | undefined;
  
        if (seed.player_name) {
          player = await manager.getRepository(Player).findOne({
            where: {
              name: seed.player_name,
              jersey_number: seed.jersey_number,
            },
          });
  
          if (!player) {
            player = this.playerRepository.create({
              name: seed.player_name,
              jersey_number: seed.jersey_number,
              position: seed.position,
              throws_bats: seed.throws_bats,
              team: team,
            });
            await manager.getRepository(Player).upsert(player, ['name', 'jersey_number']);
          }
        }
  
        await manager.getRepository(CheeringSong).upsert({
          title: seed.title,
          lyrics: seed.lyrics,
          link: seed.link,
          team: team,
          player: player,
        }, ['link']);
      }
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
