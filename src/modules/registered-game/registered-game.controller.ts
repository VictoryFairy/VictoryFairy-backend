import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RegisteredGameService } from 'src/modules/registered-game/registered-game.service';
import { CreateRegisteredGameDto } from './dto/request/req-create-registered-game.dto';
import { UpdateRegisteredGameDto } from './dto/request/req-update-registered-game.dto';
import { RegisteredGameWithGameDto } from './dto/internal/registerd-game-with-game.dto';
import { FindAllMonthlyQueryDto } from './dto/request/req-findall-monthly-quert.dto';
import { DeleteRegisteredGameDto } from './dto/internal/delete-registered-game.dto';

@ApiTags('RegisteredGame')
@Controller('registered-games')
@JwtAuth('access')
export class RegisteredGameController {
  constructor(private readonly registeredGameService: RegisteredGameService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '직관 경기 등록' })
  @ApiCreatedResponse({
    type: RegisteredGameWithGameDto,
    description: '등록한 직관 경기의 정보',
  })
  async create(
    @Body() createRegisteredGameDto: CreateRegisteredGameDto,
    @CurrentUser('id') userId: number,
  ): Promise<RegisteredGameWithGameDto> {
    const registeredGame = await this.registeredGameService.create(
      createRegisteredGameDto,
      userId,
    );
    return registeredGame;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '유저가 등록한 모든 직관 경기 반환' })
  @ApiOkResponse({
    type: [RegisteredGameWithGameDto],
    description: '유저가 등록한 직관 경기가 없을 경우에는 빈 배열 반환',
  })
  async findAll(
    @CurrentUser('id') userId: number,
  ): Promise<RegisteredGameWithGameDto[]> {
    const registeredGames = await this.registeredGameService.getAll(userId);
    return registeredGames;
  }

  @Get('monthly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당 달에 유저가 등록한 모든 직관 경기 반환' })
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
  @ApiOkResponse({
    type: [RegisteredGameWithGameDto],
    description:
      '해당 달에 유저가 등록한 직관 경기가 없을 경우에는 빈 배열 반환',
  })
  async findAllMonthly(
    @Query() query: FindAllMonthlyQueryDto,
    @CurrentUser('id') userId: number,
  ): Promise<RegisteredGameWithGameDto[]> {
    const { year, month } = query;
    const registeredGames = await this.registeredGameService.getAllMonthly(
      year,
      month,
      userId,
    );
    return registeredGames;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '유저가 등록한 해당하는 ID의 직관 경기 반환' })
  @ApiParam({
    name: 'id',
    description: '등록한 직관 경기 ID',
    example: 1,
  })
  @ApiOkResponse({
    type: RegisteredGameWithGameDto,
    description: '요청한 ID의 직관 경기',
  })
  @ApiNotFoundResponse({
    description: '유저가 등록한 해당하는 ID의 직관 경기가 없을 경우',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<RegisteredGameWithGameDto> {
    const registeredGame = await this.registeredGameService.getOne(id, userId);
    return registeredGame;
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '유저가 등록한 해당하는 ID의 직관 경기 수정' })
  @ApiParam({
    name: 'id',
    description: '등록한 직관 경기 ID',
    example: 1,
  })
  @ApiNoContentResponse({
    description: '성공 시 별 다른 데이터를 반환하지 않음',
  })
  @ApiNotFoundResponse({
    description: '유저가 등록한 해당하는 ID의 직관 경기가 없을 경우',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRegisteredGameDto: UpdateRegisteredGameDto,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    await this.registeredGameService.update(
      id,
      updateRegisteredGameDto,
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '유저가 등록한 해당하는 ID의 직관 경기 삭제' })
  @ApiParam({
    name: 'id',
    description: '등록한 직관 경기 ID',
    example: 1,
  })
  @ApiNoContentResponse({
    description: '성공 시 별 다른 데이터를 반환하지 않음',
  })
  @ApiNotFoundResponse({
    description: '유저가 등록한 해당하는 ID의 직관 경기가 없을 경우',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    const dto = await DeleteRegisteredGameDto.createAndValidate({
      gameId: id,
      userId,
    });
    await this.registeredGameService.delete(dto);
  }
}
