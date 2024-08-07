import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { FindAllDailyQueryDto, GameDto } from 'src/dtos/game.dto';
import { GameService } from 'src/services/game.service';

@ApiTags('Game')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [GameDto] })
  async findAllDaily(@Query() query: FindAllDailyQueryDto): Promise<GameDto[]> {
    const { year, month, day } = query;
    const games = await this.gameService.findAllDaily(year, month, day);
    return plainToInstance(GameDto, games);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GameDto })
  async findOne(@Param('id') id: string): Promise<GameDto> {
    const game = await this.gameService.findOne(id);
    return plainToInstance(GameDto, game);
  }
}
