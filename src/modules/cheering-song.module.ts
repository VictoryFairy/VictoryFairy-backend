import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheeringSongController } from 'src/controllers/cheering-song.controller';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { CheeringSongService } from 'src/services/cheering-song.service';
import { TeamModule } from './team.module';
import { Player } from 'src/entities/player.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheeringSong, Player]),
    AuthModule,
    TeamModule,
  ],
  controllers: [CheeringSongController],
  providers: [CheeringSongService],
  exports: [CheeringSongService],
})
export class CheeringSongModule {}
