import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { ICheeringSongSeed, TCheeringSongType } from 'src/types/seed.type';
import { Brackets, FindOptionsWhere, LessThan, Like, MoreThan, QueryBuilder, Repository } from 'typeorm';
import { TeamService } from './team.service';
import { Player } from 'src/entities/player.entity';
import { TTeam } from 'src/types/crawling-game.type';
import { Team } from 'src/entities/team.entity';
import { CursorPageDto } from 'src/dtos/cursor-page.dto';

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

        if (seed.type === 'player') {
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
            await manager
              .getRepository(Player)
              .upsert(player, ['name', 'jersey_number']);
          }
        }

        await manager.getRepository(CheeringSong).upsert(
          {
            type: seed.type,
            title: seed.title,
            lyrics: seed.lyrics,
            link: seed.link,
            team: team,
            player: player,
          },
          ['link'],
        );
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

  async findByTeamIdAndTypeWithInfiniteScroll(
    teamId: number,
    type: TCheeringSongType,
    take: number,
    cursor?: number,
  ): Promise<CursorPageDto<CheeringSong>> {
    const team = await this.teamService.findOne(teamId);

    const where: FindOptionsWhere<CheeringSong> = {
      team,
      type
    }

    if (cursor) {
      where.id = MoreThan(cursor);
    }

    const [cheeringSongs, count] =
      await this.cheeringSongRepository.findAndCount({
        take: take + 1,
        where,
        relations: { player: true },
        order: { id: 'ASC' },
      });

    const hasNextData = cheeringSongs.length > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      meta: {
        take,
        hasNextData,
        cursor: newCursor,
      },
    };
  }

  async findBySearchWithInfiniteScroll(
    take: number,
    cursor?: number,
    q?: string,
  ): Promise<CursorPageDto<CheeringSong>> {
    const queryBuilder = this.cheeringSongRepository.createQueryBuilder('cheeringSong')
      .leftJoinAndSelect('cheeringSong.player', 'player')
      .orderBy('cheeringSong.id', 'ASC')
      .take(take + 1);
  
    if (cursor) {
      queryBuilder.andWhere('cheeringSong.id > :cursor', { cursor });
    }
  
    if (q) {
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('cheeringSong.title LIKE :q', { q: `%${q.replace(/[%_]/g, '\\$&')}%` })
          .orWhere('cheeringSong.lyrics LIKE :q', { q: `%${q.replace(/[%_]/g, '\\$&')}%` })
          .orWhere('player.name LIKE :q', { q: `%${q.replace(/[%_]/g, '\\$&')}%` });
      }));
    }
  
    const cheeringSongs = await queryBuilder.getMany();
    const count = cheeringSongs.length;
  
    const hasNextData = count > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;
  
    return {
      data,
      meta: {
        take,
        hasNextData,
        cursor: newCursor,
      },
    };
  }
}
