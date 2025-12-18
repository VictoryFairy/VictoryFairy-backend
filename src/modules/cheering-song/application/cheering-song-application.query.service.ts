import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, EntityManager, MoreThan } from 'typeorm';
import { CheeringSong } from '../core/domain/cheering-song.entity';
import { LikeCheeringSong } from '../core/domain/like-cheering-song.entity';
import { Team } from '../../team/core/domain/team.entity';
import { TCheeringSongType } from 'src/shared/types/seed.type';
import { CursorPageCheeringSongDto } from 'src/shared/dto/cursor-page.dto';
import { InjectEntityManager } from '@nestjs/typeorm';

@Injectable()
export class CheeringSongApplicationQueryService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  /**
   * 검색어로 응원가 목록 조회 (무한 스크롤)
   */
  async findBySearchWithInfiniteScroll(
    userId: number,
    take: number,
    cursor?: number,
    q?: string,
  ): Promise<
    Omit<CursorPageCheeringSongDto, 'data'> & { data: CheeringSong[] }
  > {
    const queryBuilder = this.em
      .createQueryBuilder(CheeringSong, 'cheering_song')
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
    const hasNextData = cheeringSongs.length > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;
    for (const datum of data) {
      const isLiked = await this.checkIsLiked(datum.id, userId);
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

  /**
   * 응원가 단건 조회
   */
  async findOne(id: number): Promise<CheeringSong> {
    const cheeringSong = await this.em.findOne(CheeringSong, {
      where: { id },
      relations: { player: true, team: true },
    });
    if (!cheeringSong) {
      throw new NotFoundException(`Cheering song with id ${id} is not found`);
    }
    return cheeringSong;
  }

  /**
   * 팀 ID와 타입으로 응원가 목록 조회 (무한 스크롤)
   */
  async findByTeamIdAndTypeWithInfiniteScroll(
    teamId: number,
    type: TCheeringSongType,
    userId: number,
    take: number,
    cursor?: number,
  ): Promise<
    Omit<CursorPageCheeringSongDto, 'data'> & { data: CheeringSong[] }
  > {
    const team = await this.em.findOne(Team, {
      where: { id: teamId },
    });
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} is not found`);
    }
    const where: Record<string, unknown> = {
      team: { id: teamId },
      type,
    };
    if (cursor) {
      where.id = MoreThan(cursor);
    }
    const cheeringSongs = await this.em.find(CheeringSong, {
      take: take + 1,
      where,
      relations: { player: true, team: true },
      order: { id: 'ASC' },
    });
    const hasNextData = cheeringSongs.length > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;
    for (const datum of data) {
      const isLiked = await this.checkIsLiked(datum.id, userId);
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

  /**
   * 좋아요한 응원가 목록 조회 (무한 스크롤)
   */
  async findByLikedWithInfiniteScroll(
    type: TCheeringSongType,
    userId: number,
    take: number,
    cursor?: number,
  ): Promise<
    Omit<CursorPageCheeringSongDto, 'data'> & { data: CheeringSong[] }
  > {
    const queryBuilder = this.em
      .createQueryBuilder(CheeringSong, 'cheering_song')
      .innerJoin(
        'like_cheering_song',
        'like_cheering_song',
        'like_cheering_song.cheering_song_id = cheering_song.id',
      )
      .where('like_cheering_song.user_id = :user_id', { user_id: userId })
      .andWhere('cheering_song.type = :type', { type })
      .orderBy('cheering_song.id', 'ASC')
      .leftJoinAndSelect('cheering_song.player', 'player')
      .leftJoinAndSelect('cheering_song.team', 'team')
      .take(take + 1);
    if (cursor) {
      queryBuilder.andWhere('cheering_song.id > :cursor', { cursor });
    }
    const cheeringSongs = await queryBuilder.getMany();
    const hasNextData = cheeringSongs.length > take;
    const data = hasNextData ? cheeringSongs.slice(0, -1) : cheeringSongs;
    const newCursor = data.length > 0 ? data[data.length - 1].id : null;
    for (const datum of data) {
      const isLiked = await this.checkIsLiked(datum.id, userId);
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

  /**
   * 응원가 좋아요 여부 조회
   */
  async getCheeringSongIsLiked(
    cheeringSongId: number,
    userId: number,
  ): Promise<{ isLiked: boolean }> {
    const isLiked = await this.checkIsLiked(cheeringSongId, userId);
    return { isLiked };
  }

  /**
   * 응원가 좋아요 수 조회
   */
  async getCheeringSongLikes(
    cheeringSongId: number,
  ): Promise<{ count: number }> {
    const cheeringSong = await this.findOne(cheeringSongId);
    const count = await this.em.count(LikeCheeringSong, {
      where: { cheeringSong: { id: cheeringSong.id } },
    });
    return { count };
  }

  /**
   * 좋아요 여부 확인 (내부 헬퍼)
   */
  private async checkIsLiked(
    cheeringSongId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.em.findOne(LikeCheeringSong, {
      where: {
        cheeringSong: { id: cheeringSongId },
        user: { id: userId },
      },
    });
    return result !== null;
  }
}
