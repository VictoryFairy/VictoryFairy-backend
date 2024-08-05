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
import { firstValueFrom } from 'rxjs';
import { GameService } from 'src/services/game.service';

@ApiTags('Game')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('schedules')
  getGamesSchedule() {
    return this.gameService.getSchedules();
  }

  @Get('scores')
  async getScores(): Promise<unknown> {
    return this.gameService.getCurrentGameStatus(1, 0, '20240801LGSS0', 2024);
  }
}
