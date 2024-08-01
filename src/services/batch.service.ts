import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { GameService } from "./game.service";

@Injectable()
export class BatchService {
  constructor(
    private readonly gameService: GameService,
  ) {}

  @Cron('0 0 4 * * *', {
    name: 'batchGames'
  })
  batchGames() {
    this.gameService.getSchedules().subscribe({
      next: () => { console.log('Start to save Game Data...') },
      complete: () => { console.log('Game Data Saved Successfully.') },
      error: (error) => { throw new Error(error) },
    });
  }

  
}