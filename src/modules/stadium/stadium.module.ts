import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StadiumController } from 'src/modules/stadium/stadium.controller';
import { Stadium } from 'src/modules/stadium/entities/stadium.entity';
import { StadiumService } from 'src/modules/stadium/stadium.service';
@Module({
  imports: [TypeOrmModule.forFeature([Stadium])],
  controllers: [StadiumController],
  providers: [StadiumService],
  exports: [StadiumService],
})
export class StadiumModule {}
