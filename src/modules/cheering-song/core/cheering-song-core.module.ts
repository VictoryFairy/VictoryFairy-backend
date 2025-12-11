import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheeringSong } from './domain/cheering-song.entity';
import { LikeCheeringSong } from './domain/like-cheering-song.entity';
import { Player } from './domain/player.entity';
import { CheeringSongCoreService } from './cheering-song-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheeringSong, LikeCheeringSong, Player])],
  providers: [CheeringSongCoreService],
  exports: [CheeringSongCoreService],
})
export class CheeringSongCoreModule {}
