import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { ICheeringSongSeed, TCheeringSongType } from 'src/types/seed.type';
import { Brackets, FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { TeamService } from './team.service';
import { Player } from 'src/entities/player.entity';
import { User } from 'src/entities/user.entity';
import { LikeCheeringSong } from 'src/entities/like-cheering-song.entity';
import { CursorPageCheeringSongDto } from 'src/dtos/cursor-page.dto';

@Injectable()
export class CheeringSongService {
  private readonly logger = new Logger(CheeringSongService.name);

  constructor(
    @InjectRepository(CheeringSong)
    private readonly cheeringSongRepository: Repository<CheeringSong>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(LikeCheeringSong)
    private readonly likeCheeringSongRepository: Repository<LikeCheeringSong>,
    private readonly teamService: TeamService,
  ) {}

  async seed() {
    function readJSONFile(filePath: string): ICheeringSongSeed[] {
      try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as ICheeringSongSeed[];
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return [];
      }
    }

    function getCheeringSongData(): ICheeringSongSeed[] {
      const dirPath = 'src/seeds/refined-cheering-songs';

      let combinedData: ICheeringSongSeed[] = [];

      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (path.extname(file) === '.json') {
            const filePath = path.join(dirPath, file);
            const fileData = readJSONFile(filePath);
            combinedData = combinedData.concat(fileData);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
      }

      return combinedData;
    }

    const cheeringSongSeeder = getCheeringSongData();

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

  async findBySearchWithInfiniteScroll(
    user: User,
    take: number,
    cursor?: number,
    q?: string,
  ): Promise<
    Omit<CursorPageCheeringSongDto, 'data'> & { data: CheeringSong[] }
  > {
    const queryBuilder = this.cheeringSongRepository
      .createQueryBuilder('cheering_song')
      .leftJoinAndSelect('cheering_song.player', 'player')
      .leftJoinAndSelect('cheering_song.team', 'team')
      .orderBy('cheering_song.id', 'ASC')
      .take(take + 1);

    if (cursor) {
      queryBuilder.andWhere('cheering_song.id > :cursor', { cursor });
    }

    if (q) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('cheering_song.title LIKE :q', {
            q: `%${q.replace(/[%_]/g, '\\$&')}%`,
          })
            .orWhere('cheering_song.lyrics LIKE :q', {
              q: `%${q.replace(/[%_]/g, '\\$&')}%`,
            })
            .orWhere('player.name LIKE :q', {
              q: `%${q.replace(/[%_]/g, '\\$&')}%`,
            });
        }),
      );
    }

    const cheeringSongs = await queryBuilder.getMany();
    const count = cheeringSongs.length;

    const hasNextData = count > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;

    for (const datum of data) {
      const { isLiked } = await this.getCheeringSongIsLiked(datum.id, user);
      datum['isLiked'] = isLiked;
    }

    return {
      data,
      meta: {
        take,
        hasNextData,
        cursor: newCursor,
      },
    };
  }

  async findOne(id: number): Promise<CheeringSong> {
    const cheeringSong = await this.cheeringSongRepository.findOne({
      where: { id },
      relations: { player: true, team: true },
    });
    if (!cheeringSong) {
      throw new NotFoundException(`Cheering song with id ${id} is not found`);
    }
    return cheeringSong;
  }

  async findByTeamIdAndTypeWithInfiniteScroll(
    teamId: number,
    type: TCheeringSongType,
    user: User,
    take: number,
    cursor?: number,
  ): Promise<
    Omit<CursorPageCheeringSongDto, 'data'> & { data: CheeringSong[] }
  > {
    const team = await this.teamService.findOne(teamId);

    const where: FindOptionsWhere<CheeringSong> = {
      team,
      type,
    };

    if (cursor) {
      where.id = MoreThan(cursor);
    }

    const [cheeringSongs, count] =
      await this.cheeringSongRepository.findAndCount({
        take: take + 1,
        where,
        relations: { player: true, team: true },
        order: { id: 'ASC' },
      });

    const hasNextData = cheeringSongs.length > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;

    for (const datum of data) {
      const { isLiked } = await this.getCheeringSongIsLiked(datum.id, user);
      datum['isLiked'] = isLiked;
    }

    return {
      data,
      meta: {
        take,
        hasNextData,
        cursor: newCursor,
      },
    };
  }

  async likeCheerSong(
    cheeringSongId: number,
    user: User,
  ): Promise<LikeCheeringSong> {
    const cheeringSong = await this.findOne(cheeringSongId);

    const duplicate = await this.likeCheeringSongRepository.findOne({
      where: {
        cheeringSong,
        user,
      },
    });

    if (duplicate) {
      throw new ConflictException('The user alreay liked the game.');
    }

    const like = new LikeCheeringSong();
    like.cheeringSong = cheeringSong;
    like.user = user;
    this.likeCheeringSongRepository.save(like);
    return like;
  }

  async unlikeCheerSong(cheeringSongId: number, user: User): Promise<void> {
    const cheeringSong = await this.findOne(cheeringSongId);
    const result = await this.likeCheeringSongRepository.delete({
      cheeringSong,
      user,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Like relationship with cheering song ${cheeringSongId} and user ${user.id} not found.`,
      );
    }
  }

  async getCheeringSongIsLiked(
    cheeringSongId: number,
    user: User,
  ): Promise<{ isLiked: boolean }> {
    const cheeringSong = await this.findOne(cheeringSongId);
    const result = await this.likeCheeringSongRepository.findOne({
      where: {
        cheeringSong,
        user,
      },
    });

    const isLiked = result !== null;

    return { isLiked };
  }

  async getCheeringSongLikes(
    cheeringSongId: number,
  ): Promise<{ count: number }> {
    const cheeringSong = await this.findOne(cheeringSongId);
    const [likes, count] = await this.likeCheeringSongRepository.findAndCount({
      where: { cheeringSong },
    });

    return { count };
  }

  async findByLikedWithInfiniteScroll(
    type: TCheeringSongType,
    user: User,
    take: number,
    cursor?: number,
  ): Promise<unknown> {
    const queryBuilder = this.cheeringSongRepository
      .createQueryBuilder('cheering_song')
      .innerJoin(
        'like_cheering_song',
        'like_cheering_song',
        'like_cheering_song.cheering_song_id = cheering_song.id',
      )
      .where('like_cheering_song.user_id = :user_id', { user_id: user.id })
      .andWhere('cheering_song.type = :type', { type })
      .orderBy('cheering_song.id', 'ASC')
      .leftJoinAndSelect('cheering_song.player', 'player')
      .leftJoinAndSelect('cheering_song.team', 'team')
      .take(take + 1);

    if (cursor) {
      queryBuilder.andWhere('cheering_song.id > :cursor', { cursor });
    }

    const cheeringSongs = await queryBuilder.getMany();
    const count = cheeringSongs.length;

    const hasNextData = count > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;

    // 유저가 이 응원가를 좋아요 표시 했는지 여부 확인 로직 추가
    for (const datum of data) {
      const { isLiked } = await this.getCheeringSongIsLiked(datum.id, user);
      datum['isLiked'] = isLiked; // isLiked 필드 추가
    }

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
