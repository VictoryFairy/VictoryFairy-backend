import { Controller, Delete, Get, Post } from '@nestjs/common';
import { RankService } from '../services/rank.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Rank')
@Controller('rank')
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Post()
  saveTest() {
    return this.rankService.saveTest();
  }

  @Get()
  getTest() {
    return this.rankService.getTest();
  }

  @Delete()
  delTest() {
    return this.rankService.delTest();
  }
}
