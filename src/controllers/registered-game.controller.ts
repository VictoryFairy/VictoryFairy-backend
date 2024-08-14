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
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { UserDeco } from 'src/decorator/user.decorator';
import {
  CreateRegisteredGameDto,
  FindAllMonthlyQueryDto,
  RegisteredGameDto,
  UpdateRegisteredGameDto,
} from 'src/dtos/registered-game.dto';
import { User } from 'src/entities/user.entity';
import { RegisteredGameService } from 'src/services/registered-game.service';

@ApiTags('RegisteredGame')
@Controller('registered-games')
@JwtAuth('access')
export class RegisteredGameController {
  constructor(private readonly registeredGameService: RegisteredGameService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '직관 경기 등록' })
  @ApiCreatedResponse({
    type: RegisteredGameDto,
    description: '등록한 직관 경기의 정보',
  })
  async create(
    @Body() createRegisteredGameDto: CreateRegisteredGameDto,
    @UserDeco() user: User,
  ): Promise<RegisteredGameDto> {
    const registeredGame = await this.registeredGameService.create(
      createRegisteredGameDto,
      user,
    );
    return plainToInstance(RegisteredGameDto, registeredGame);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '유저가 등록한 모든 직관 경기 반환' })
  @ApiOkResponse({
    type: [RegisteredGameDto],
    description: '유저가 등록한 직관 경기가 없을 경우에는 빈 배열 반환',
  })
  async findAll(@UserDeco() user: User): Promise<RegisteredGameDto[]> {
    const registeredGames = await this.registeredGameService.findAll(user);
    return plainToInstance(RegisteredGameDto, registeredGames);
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
    type: [RegisteredGameDto],
    description:
      '해당 달에 유저가 등록한 직관 경기가 없을 경우에는 빈 배열 반환',
  })
  async findAllMonthly(
    @Query() query: FindAllMonthlyQueryDto,
    @UserDeco() user: User,
  ): Promise<RegisteredGameDto[]> {
    const { year, month } = query;
    const registeredGames = await this.registeredGameService.findAllMonthly(
      year,
      month,
      user,
    );
    return plainToInstance(RegisteredGameDto, registeredGames);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '유저가 등록한 해당하는 ID의 직관 경기 반환' })
  @ApiParam({
    name: 'id',
    description: '등록한 직관 경기 ID',
    example: 1,
  })
  @ApiNotFoundResponse({
    description: '유저가 등록한 해당하는 ID의 직관 경기가 없을 경우',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @UserDeco() user: User,
  ): Promise<RegisteredGameDto> {
    const registeredGame = await this.registeredGameService.findOne(id, user);
    return plainToInstance(RegisteredGameDto, registeredGame);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('access')
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
    @UserDeco() user: User,
  ): Promise<void> {
    await this.registeredGameService.update(id, updateRegisteredGameDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @JwtAuth('access')
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
    @UserDeco() user: User,
  ): Promise<void> {
    await this.registeredGameService.delete(id, user);
  }
}
