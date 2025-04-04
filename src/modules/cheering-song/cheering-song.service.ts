import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TCheeringSongType } from 'src/shared/types/seed.type';
import { Brackets, FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { TeamService } from '../team/team.service';
import { LikeCheeringSong } from 'src/modules/cheering-song/entities/like-cheering-song.entity';
import { User } from '../user/entities/user.entity';
import { CursorPageCheeringSongDto } from 'src/shared/dtos/cursor-page.dto';
import { CheeringSong } from './entities/cheering-song.entity';

@Injectable()
export class CheeringSongService {
  constructor(
    @InjectRepository(CheeringSong)
    private readonly cheeringSongRepository: Repository<CheeringSong>,
    @InjectRepository(LikeCheeringSong)
    private readonly likeCheeringSongRepository: Repository<LikeCheeringSong>,
    private readonly teamService: TeamService,
  ) {}

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
        user: { id: user.id },
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
      user: { id: user.id },
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
        user: { id: user.id },
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
