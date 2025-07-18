import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { GameService } from 'src/modules/game/game.service';
import { FindAllDailyQueryDto, GameDto } from './dto/game.dto';
import { RegisteredGameService } from '../registered-game/registered-game.service';
import { ResGameDailyDto } from './dto/response/res-game-daily.dto';
import { groupGamesByTeam } from './util/gamel-list-group-by-team.util';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import * as moment from 'moment';

@ApiTags('Game')
@Controller('games')
@JwtAuth('access')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly registeredGameService: RegisteredGameService,
  ) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '하루 동안의 경기 목록 반환' })
  @ApiQuery({ name: 'year', type: Number, description: '년도', example: 2024 })
  @ApiQuery({ name: 'month', type: Number, description: '월', example: 8 })
  @ApiQuery({ name: 'day', type: Number, description: '일', example: 1 })
  @ApiOkResponse({
    type: ResGameDailyDto,
    description: [
      'games: 해당 날짜의 경기를 팀별로 그룹화한 데이터',
      '',
      'registeredGameIds: 해당 날짜의 유저가 등록한 경기 ID 목록',
    ].join('\n'),
    examples: {
      example1: {
        summary: '게임 있는 경우',
        value: ResGameDailyDto.swaggerExample(),
      },
      example2: {
        summary: '게임 없는 경우',
        value: { games: {}, registeredGameIds: [] },
      },
    },
  })
  async findAllDaily(
    @CurrentUser('id') userId: number,
    @Query() query: FindAllDailyQueryDto,
  ): Promise<ResGameDailyDto> {
    const { year, month, day } = query;
    const [games, registeredGameIds] = await Promise.all([
      this.gameService.findAllDaily(year, month, day),
      this.registeredGameService.getDailyRegisteredGameId(
        year,
        month,
        day,
        userId,
      ),
    ]);

    const gamesDto = plainToInstance(GameDto, games);

    const groupedGames = groupGamesByTeam(gamesDto);

    return {
      games: groupedGames,
      registeredGameIds,
    };
  }

  @Get('today')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '오늘 경기 목록 반환, 경기가 없는 경우 빈배열 반환',
  })
  @ApiOkResponse({
    type: [GameDto],
    description: '오늘 경기 목록',
  })
  @ApiInternalServerErrorResponse({ description: '서버 오류 발생 시' })
  async findToday(): Promise<GameDto[]> {
    const today = moment().tz('Asia/Seoul');
    const [year, month, day] = [today.year(), today.month() + 1, today.date()];
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
  @ApiOkResponse({
    type: GameDto,
    description: '[gameType] - 0: 일반 / 1: DH1 / 2: DH2',
  })
  @ApiNotFoundResponse({ description: '해당 ID의 경기가 없을 경우' })
  async findOne(@Param('id') id: string): Promise<GameDto> {
    const game = await this.gameService.findOne(id);
    return plainToInstance(GameDto, game);
  }
}
