import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheeringSongController } from 'src/modules/cheering-song/cheering-song.controller';
import { CheeringSongService } from 'src/modules/cheering-song/cheering-song.service';
import { TeamCoreModule } from '../team/core/team-core.module';
import { Player } from 'src/modules/cheering-song/entities/player.entity';
import { LikeCheeringSong } from 'src/modules/cheering-song/entities/like-cheering-song.entity';
import { CheeringSong } from './entities/cheering-song.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheeringSong, Player, LikeCheeringSong]),
    TeamCoreModule,
  ],
  controllers: [CheeringSongController],
  providers: [CheeringSongService],
  exports: [CheeringSongService],
})
export class CheeringSongModule {}
