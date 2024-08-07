import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParkingInfoService } from 'src/services/parking-info.service';

@ApiTags('ParkingInfo')
@Controller('parking-infos')
export class ParkingInfoController {
  constructor(private readonly parkingInfoService: ParkingInfoService) {}
}
