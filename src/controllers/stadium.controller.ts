import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StadiumService } from 'src/services/stadium.service';

@Controller('stadium')
export class StadiumController {
  constructor(private readonly stadiumService: StadiumService) {}

  
}
