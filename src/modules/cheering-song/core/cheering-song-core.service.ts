import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheeringSong } from './domain/cheering-song.entity';
import { LikeCheeringSong } from './domain/like-cheering-song.entity';
import { User } from '../../account/core/domain/user.entity';

@Injectable()
export class CheeringSongCoreService {
  constructor(
    @InjectRepository(CheeringSong)
    private readonly cheeringSongRepository: Repository<CheeringSong>,
    @InjectRepository(LikeCheeringSong)
    private readonly likeCheeringSongRepository: Repository<LikeCheeringSong>,
  ) {}

  /**
   * 응원가 단건 조회
   */
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

  /**
   * 응원가 좋아요 추가
   */
  async likeCheerSong(
    cheeringSongId: number,
    userId: number,
  ): Promise<LikeCheeringSong> {
    const cheeringSong = await this.findOne(cheeringSongId);
    const duplicate = await this.likeCheeringSongRepository.findOne({
      where: {
        cheeringSong: { id: cheeringSongId },
        user: { id: userId },
      },
    });
    if (duplicate) {
      throw new ConflictException('The user already liked the cheering song.');
    }
    const like = new LikeCheeringSong();
    like.cheeringSong = cheeringSong;
    like.user = { id: userId } as User;
    await this.likeCheeringSongRepository.save(like);
    return like;
  }

  /**
   * 응원가 좋아요 삭제
   */
  async unlikeCheerSong(cheeringSongId: number, userId: number): Promise<void> {
    await this.findOne(cheeringSongId);
    const result = await this.likeCheeringSongRepository.delete({
      cheeringSong: { id: cheeringSongId },
      user: { id: userId },
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Like relationship with cheering song ${cheeringSongId} and user ${userId} not found.`,
      );
    }
  }

  /**
   * 응원가 좋아요 여부 확인
   */
  async checkIsLiked(cheeringSongId: number, userId: number): Promise<boolean> {
    const result = await this.likeCheeringSongRepository.findOne({
      where: {
        cheeringSong: { id: cheeringSongId },
        user: { id: userId },
      },
    });
    return result !== null;
  }

  /**
   * 응원가 좋아요 수 조회
   */
  async countLikes(cheeringSongId: number): Promise<number> {
    await this.findOne(cheeringSongId);
    const count = await this.likeCheeringSongRepository.count({
      where: { cheeringSong: { id: cheeringSongId } },
    });
    return count;
  }
}
