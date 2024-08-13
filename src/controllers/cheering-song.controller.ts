import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { CheeringSongDto } from 'src/dtos/cheering-song.dto';
import {
  CursorPageDto,
  CursorPageOptionDto,
  CursorPageWithSearchOptionDto,
} from 'src/dtos/cursor-page.dto';
import { CheeringSongService } from 'src/services/cheering-song.service';
import { TCheeringSongType } from 'src/types/seed.type';

@ApiTags('CheeringSong')
@Controller('cheering-songs')
// @JwtAuth('access')
export class CheeringSongController {
  private readonly logger = new Logger(CheeringSongController.name)

  constructor(private readonly cheeringSongService: CheeringSongService) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '검색한 응원가 목록 및 무한 스크롤 정보 반환',
  })
  async findBySearchWithInfiniteScroll(
    @Query() cursorPageWithSearchOptionDto: CursorPageWithSearchOptionDto,
  ): Promise<CursorPageDto<CheeringSongDto>> {
    const { take, cursor, q } = cursorPageWithSearchOptionDto;
    
    const cheeringSongsWithCursorMeta =
      await this.cheeringSongService.findBySearchWithInfiniteScroll(
        take,
        cursor,
        q,
      );

    return plainToInstance(
      CursorPageDto<CheeringSongDto>,
      cheeringSongsWithCursorMeta,
    );
  }

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
  @ApiOperation({
    summary: '팀 ID, 타입으로 필터링 한 응원가 목록 및 무한 스크롤 정보 반환',
  })
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
        value: 'team',
      },
      player: {
        summary: '선수 응원가',
        value: 'player',
      },
    },
  })
  @ApiOkResponse({ type: CursorPageDto<CheeringSongDto> })
  async findByTeamAndNameWithInfiniteScroll(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('type') type: TCheeringSongType,
    @Query() cursorPageOptionDto: CursorPageOptionDto,
  ): Promise<CursorPageDto<CheeringSongDto>> {
    const { take, cursor } = cursorPageOptionDto;

    const cheeringSongsWithCursorMeta =
      await this.cheeringSongService.findByTeamIdAndTypeWithInfiniteScroll(
        teamId,
        type,
        take,
        cursor,
      );
    return plainToInstance(
      CursorPageDto<CheeringSongDto>,
      cheeringSongsWithCursorMeta,
    );
  }
}
