import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingInfoController } from 'src/controllers/parking-info.controller';
import { ParkingInfo } from 'src/entities/parking-info.entity';
import { ParkingInfoService } from 'src/services/parking-info.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingInfo])],
  controllers: [ParkingInfoController],
  providers: [ParkingInfoService],
})
export class ParkingInfoModule {}
