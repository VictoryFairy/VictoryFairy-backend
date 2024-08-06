import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GameDto } from 'src/dtos/game.dto';
import { GameService } from 'src/services/game.service';

@ApiTags('Game')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('daily/:year/:month/:day')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [GameDto] })
  async findAll(
    @Param('year') year: number,
    @Param('month') month: number,
    @Param('day') day: number,
  ): Promise<GameDto[]> {
    return await this.gameService.findAllDaily(year, month, day);
  }
}
