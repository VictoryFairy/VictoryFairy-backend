import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ParkingInfoDto } from 'src/dtos/parking-info.dto';
import { ParkingInfoService } from 'src/services/parking-info.service';

@ApiTags('ParkingInfo')
@Controller('parking-infos')
export class ParkingInfoController {
  constructor(private readonly parkingInfoService: ParkingInfoService) {}

  @Get('stadium/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ParkingInfoDto] })
  async findByStadiumId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ParkingInfoDto[]> {
    const parkingInfos = await this.parkingInfoService.findByStadiumId(id);
    return plainToInstance(ParkingInfoDto, parkingInfos);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [ParkingInfoDto] })
  async findAll(): Promise<ParkingInfoDto[]> {
    const parkingInfos = await this.parkingInfoService.findAll();
    return plainToInstance(ParkingInfoDto, parkingInfos);
  }
}
