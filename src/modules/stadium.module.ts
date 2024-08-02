import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StadiumController } from 'src/controllers/stadium.controller';
import { Stadium } from 'src/entities/stadium.entity';
import { StadiumService } from 'src/services/stadium.service';
@Module({
  imports: [TypeOrmModule.forFeature([Stadium])],
  controllers: [StadiumController],
  providers: [StadiumService],
  exports: [StadiumService],
})
export class StadiumModule {}
