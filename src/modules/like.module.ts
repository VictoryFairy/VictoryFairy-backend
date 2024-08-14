import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikeCheeringSong } from 'src/entities/like-cheering-song.entity';
import { CheeringSongModule } from './cheering-song.module';
import { LikeController } from 'src/controllers/like.controller';
import { LikeService } from 'src/services/like.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([LikeCheeringSong]), AuthModule, CheeringSongModule],
  controllers: [LikeController],
  providers: [LikeService],
})
export class LikeModule {}
