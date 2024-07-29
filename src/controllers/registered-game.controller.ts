import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RegisteredGameService } from 'src/services/registered-game.service';

@Controller('registered-game')
export class RegisteredGameController {
  constructor(private readonly registeredGameService: RegisteredGameService) {}
}
