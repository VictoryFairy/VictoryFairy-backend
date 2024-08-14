import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { LikeCheeringSong } from 'src/entities/like-cheering-song.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { CheeringSongService } from './cheering-song.service';
import { UserService } from './user.service';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(LikeCheeringSong)
    private readonly likeCheeringSongRepository: Repository<LikeCheeringSong>,
    private readonly cheeringSongService: CheeringSongService,
  ) {}

  async likeCheerSong(
    cheeringSongId: number,
    user: User,
  ): Promise<LikeCheeringSong> {
    const cheeringSong = await this.cheeringSongService.findOne(cheeringSongId);
    
    const duplicate = await this.likeCheeringSongRepository.findOne({
      where: {
        cheeringSong,
        user,
      }
    });

    if (duplicate) {
      throw new ConflictException('The user alreay liked the game.')
    }

    const like = new LikeCheeringSong();
    like.cheeringSong = cheeringSong;
    like.user = user;
    this.likeCheeringSongRepository.save(like);
    return like;
  }

  async unlikeCheerSong(cheeringSongId: number, user: User): Promise<void> {
    const cheeringSong = await this.cheeringSongService.findOne(cheeringSongId);
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

  async getLikes(cheeringSongId: number): Promise<{ count: number }> {
    const cheeringSong = await this.cheeringSongService.findOne(cheeringSongId);
    const [likes, count] = await this.likeCheeringSongRepository.findAndCount({
      where: { cheeringSong },
    });

    return { count };
  }
}
