import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingInfo } from './domain/parking-info.entity';
import { ParkingInfoCoreService } from './parking-info-core.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingInfo])],
  providers: [ParkingInfoCoreService],
  exports: [ParkingInfoCoreService],
})
export class ParkingInfoCoreModule {}
