import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParkingInfoService } from 'src/services/parking-info.service';

@Controller('parking-info')
export class ParkingInfoController {
  constructor(private readonly parkingInfoService: ParkingInfoService) {}
}