import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheeringSongController } from 'src/controllers/cheering-song.controller';
import { CheeringSong } from 'src/entities/cheering-song.entity';
import { CheeringSongService } from 'src/services/cheering-song.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheeringSong])],
  controllers: [CheeringSongController],
  providers: [CheeringSongService],
  exports: [CheeringSongService],
})
export class CheeringSongModule {}
