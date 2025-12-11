import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingInfoController } from 'src/modules/parking-info/parking-info.controller';
import { ParkingInfoService } from 'src/modules/parking-info/parking-info.service';
import { StadiumCoreModule } from '../stadium/core/stadium-core.module';
import { ParkingInfo } from './entities/parking-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingInfo]), StadiumCoreModule],
  controllers: [ParkingInfoController],
  providers: [ParkingInfoService],
  exports: [ParkingInfoService],
})
export class ParkingInfoModule {}
