import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GameService } from 'src/services/game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('schedules')
  getGamesSchedule() {
    return this.gameService.getSchedules();
  }

  @Get('scores')
  async getScores(): Promise<any[]> {
    const scoresPromise = firstValueFrom(this.gameService.getScores());
    const statusPromise = firstValueFrom(this.gameService.getStatus());

    const [scores, status] = await Promise.all([scoresPromise, statusPromise]);

    return [scores, status];
  }
}
