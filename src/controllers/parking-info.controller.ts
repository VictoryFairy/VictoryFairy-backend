import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParkingInfoService } from 'src/services/parking-info.service';
import { CreateParkingInfoDto } from './dto/create-parking-info.dto';
import { UpdateParkingInfoDto } from './dto/update-parking-info.dto';

@Controller('parking-info')
export class ParkingInfoController {
  constructor(private readonly parkingInfoService: ParkingInfoService) {}

  @Post()
  create(@Body() createParkingInfoDto: CreateParkingInfoDto) {
    return this.parkingInfoService.create(createParkingInfoDto);
  }

  @Get()
  findAll() {
    return this.parkingInfoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parkingInfoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParkingInfoDto: UpdateParkingInfoDto) {
    return this.parkingInfoService.update(+id, updateParkingInfoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parkingInfoService.remove(+id);
  }
}
