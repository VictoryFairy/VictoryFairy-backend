import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheeringSongController } from 'src/controllers/cheering-song.controller';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { CheeringSongService } from 'src/services/cheering-song.service';
import { TeamModule } from './team.module';
import { Player } from 'src/entities/player.entity';
import { LikeCheeringSong } from 'src/entities/like-cheering-song.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheeringSong, Player, LikeCheeringSong]),
    TeamModule,
  ],
  controllers: [CheeringSongController],
  providers: [CheeringSongService],
  exports: [CheeringSongService],
})
export class CheeringSongModule {}
