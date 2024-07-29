import { Module } from '@nestjs/common';
import { ParkingInfoController } from 'src/controllers/parking-info.controller';
import { ParkingInfoService } from 'src/services/parking-info.service';

@Module({
  controllers: [ParkingInfoController],
  providers: [ParkingInfoService],
})
export class ParkingInfoModule {}
