import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { TeamDto } from 'src/modules/team/dto/response/team.dto';
import { TeamService } from 'src/modules/team/team.service';

@ApiTags('Team')
@Controller('teams')
@JwtAuth('access')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '모든 정규 팀 혹은 해당 이름의 팀 정보 반환' })
  @ApiQuery({
    name: 'name',
    description: '팀 이름',
    type: String,
    required: false,
  })
  @ApiOkResponse({ type: [TeamDto], description: '정보가 없어도 빈 배열 반환' })
  async findAll(@Query('name') name?: string): Promise<TeamDto[]> {
    const teams = await this.teamService.findAll(name);
    return plainToInstance(TeamDto, teams);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당하는 ID의 팀 정보 반환 ' })
  @ApiParam({
    name: 'id',
    description: '팀 ID',
    example: 1,
  })
  @ApiOkResponse({ type: TeamDto })
  @ApiNotFoundResponse({ description: '해당하는 ID의 팀이 없을 경우' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TeamDto> {
    const team = await this.teamService.findOne(id);
    return plainToInstance(TeamDto, team);
  }
}
