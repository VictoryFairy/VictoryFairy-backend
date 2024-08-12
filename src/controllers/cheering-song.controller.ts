import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { CheeringSongDto } from 'src/dtos/cheering-song.dto';
import { CheeringSongService } from 'src/services/cheering-song.service';
import { TCheeringSongType } from 'src/types/seed.type';

@ApiTags('CheeringSong')
@Controller('cheering-songs')
@JwtAuth('access')
export class CheeringSongController {
  constructor(private readonly cheeringSongService: CheeringSongService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '응원가 하나 반환' })
  @ApiOkResponse({ type: CheeringSongDto })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CheeringSongDto> {
    const cheeringSong = await this.cheeringSongService.findOne(id);
    return plainToInstance(CheeringSongDto, cheeringSong);
  }

  @Get('teams/:teamId/types/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '팀 ID, 타입, 검색(지금X)으로 필터링 한 응원가 목록 반환' })
  @ApiParam({
    name: 'teamId',
    type: Number,
    description: '팀 ID',
    example: 1,
  })
  @ApiParam({
    name: 'type',
    type: String,
    description: '응원가 타입',
    examples: {
      team: {
        summary: '팀 공통 응원가',
        value: 'team'
      },
      player: {
        summary: '선수 응원가',
        value: 'player'
      }
    }
  })
  @ApiQuery({
    name: 'q',
    type: String,
    description: '검색어',
    example: '구현 안됨',
    required: false,
  })
  @ApiOkResponse({ type: [CheeringSongDto] })
  async findByTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('type') type: TCheeringSongType,
    @Query('q') q: string,
  ): Promise<CheeringSongDto[]> {
    const cheeringSongs = await this.cheeringSongService.findByTeamIdAndName(teamId, type, q);
    return plainToInstance(CheeringSongDto, cheeringSongs);
  }
}
