import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { FindAllDailyQueryDto, GameDto } from 'src/dtos/game.dto';
import { GameService } from 'src/services/game.service';

@ApiTags('Game')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '하루 동안의 경기 목록 반환' })
  @ApiQuery({
    name: 'year',
    type: Number,
    description: '년도',
    example: 2024,
  })
  @ApiQuery({
    name: 'month',
    type: Number,
    description: '월',
    example: 8,
  })
  @ApiQuery({
    name: 'day',
    type: Number,
    description: '일',
    example: 1,
  })
  @ApiOkResponse({
    type: [GameDto],
    description: '데이터가 없으면 빈 배열 반환',
  })
  async findAllDaily(@Query() query: FindAllDailyQueryDto): Promise<GameDto[]> {
    const { year, month, day } = query;
    const games = await this.gameService.findAllDaily(year, month, day);
    return plainToInstance(GameDto, games);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ID로 경기 반환' })
  @ApiParam({
    name: 'id',
    type: String,
    description: '경기의 ID',
    example: '20240801SSLG0',
  })
  @ApiOkResponse({ type: GameDto })
  @ApiNotFoundResponse({ description: '해당 ID의 경기가 없을 경우' })
  async findOne(@Param('id') id: string): Promise<GameDto> {
    const game = await this.gameService.findOne(id);
    return plainToInstance(GameDto, game);
  }
}
