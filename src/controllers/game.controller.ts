import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GameService } from 'src/services/game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  
}
