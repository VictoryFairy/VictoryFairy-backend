import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserDeco } from 'src/decorator/user.decorator';
import { TeamDto } from 'src/dtos/team.dto';
import { User } from 'src/entities/user.entity';
import { TeamService } from 'src/services/team.service';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [TeamDto] })
  async findAll(@Query('name') name?: string): Promise<TeamDto[]> {
    const teams = await this.teamService.findAll(name);
    return plainToInstance(TeamDto, teams);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TeamDto })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @UserDeco() user: User,
  ): Promise<TeamDto> {
    const team = await this.teamService.findOne(id);
    return plainToInstance(TeamDto, team);
  }
}
