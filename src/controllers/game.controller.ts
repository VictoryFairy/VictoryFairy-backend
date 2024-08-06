import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { GameDto } from 'src/dtos/game.dto';
import { GameService } from 'src/services/game.service';

@ApiTags('Game')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GameDto })
  async findOne(
    @Param('id') id: string
  ): Promise<GameDto>{
    const game = await this.gameService.findOne(id);
    return plainToInstance(GameDto, game);
  }
  
  @Get('daily/:year/:month/:day')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOkResponse({ type: [GameDto] })
  async findAllDaily(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Param('day', ParseIntPipe) day: number,
  ): Promise<GameDto[]> {
    const games = await this.gameService.findAllDaily(year, month, day);
    return plainToInstance(GameDto, games);
  }
}
