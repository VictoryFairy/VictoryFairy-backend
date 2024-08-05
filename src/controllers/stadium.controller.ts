import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StadiumService } from 'src/services/stadium.service';

@ApiTags('Stadium')
@Controller('stadiums')
export class StadiumController {
  constructor(private readonly stadiumService: StadiumService) {}
}
