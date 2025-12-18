import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stadium } from './domain/stadium.entity';
import { StadiumCoreService } from './stadium-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stadium])],
  providers: [StadiumCoreService],
  exports: [StadiumCoreService],
})
export class StadiumCoreModule {}
