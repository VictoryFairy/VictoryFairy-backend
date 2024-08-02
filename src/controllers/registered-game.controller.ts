import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, Put, UnauthorizedException, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiNotFoundResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { RefreshTokenGuard } from 'src/auth/guard/refresh-token.guard';
import { UserDeco } from 'src/decorator/user.decorator';
import { CreateRegisteredGameDto, RegisteredGameDto, UpdateRegisteredGameDto } from 'src/dtos/registered-game.dto';
import { User } from 'src/entities/user.entity';
import { RegisteredGameService } from 'src/services/registered-game.service';

@Controller('registered-games')
export class RegisteredGameController {
  constructor(private readonly registeredGameService: RegisteredGameService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard, RefreshTokenGuard)
  @ApiCreatedResponse({ type: RegisteredGameDto })
  async create(
    @Body() createRegisteredGameDto: CreateRegisteredGameDto,
    @UserDeco() user: User, 
  ): Promise<RegisteredGameDto> {
    return this.registeredGameService.create(createRegisteredGameDto, user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, RefreshTokenGuard)
  @ApiOkResponse({ type: [RegisteredGameDto] })
  async findAll(
    @UserDeco() user: User, 
  ): Promise<RegisteredGameDto[]> {
    return await this.registeredGameService.findAll(user);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, RefreshTokenGuard)
  @ApiOkResponse({ type: RegisteredGameDto })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id') id: number,
    @UserDeco() user: User, 
  ): Promise<RegisteredGameDto> {
    return await this.registeredGameService.findOne(id, user);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, RefreshTokenGuard)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async update(
    @Param('id') id: number,
    @Body() updateRegisteredGameDto: UpdateRegisteredGameDto,
    @UserDeco() user: User, 
  ): Promise<void> {
    await this.registeredGameService.update(id, updateRegisteredGameDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async delete(
    @Param('id') id: number,
    @UserDeco() user: User, 
  ): Promise<void> {
    await this.registeredGameService.delete(id, user);
  }
}
