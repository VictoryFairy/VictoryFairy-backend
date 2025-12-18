import { Injectable } from '@nestjs/common';
import { CheeringSongCoreService } from '../core/cheering-song-core.service';

@Injectable()
export class CheeringSongApplicationCommandService {
  constructor(
    private readonly cheeringSongCoreService: CheeringSongCoreService,
  ) {}

  /**
   * 응원가 좋아요 추가
   */
  async likeCheerSong(cheeringSongId: number, userId: number): Promise<void> {
    await this.cheeringSongCoreService.likeCheerSong(cheeringSongId, userId);
  }

  /**
   * 응원가 좋아요 삭제
   */
  async unlikeCheerSong(cheeringSongId: number, userId: number): Promise<void> {
    await this.cheeringSongCoreService.unlikeCheerSong(cheeringSongId, userId);
  }
}
