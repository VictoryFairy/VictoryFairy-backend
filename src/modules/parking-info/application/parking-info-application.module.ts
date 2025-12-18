import { Module } from '@nestjs/common';
import { ParkingInfoCoreModule } from '../core/parking-info-core.module';
import { ParkingInfoController } from './parking-info.controller';
import { ParkingInfoApplicationQueryService } from './parking-info-application.query.service';

@Module({
  imports: [ParkingInfoCoreModule],
  controllers: [ParkingInfoController],
  providers: [ParkingInfoApplicationQueryService],
  exports: [],
})
export class ParkingInfoApplicationModule {}
