import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { UserDeco } from 'src/decorator/user.decorator';
import { CheeringSongDetailedDto } from 'src/dtos/cheering-song.dto';
import {
  CursorPageCheeringSongDto,
  CursorPageOptionDto,
  CursorPageWithSearchOptionDto,
} from 'src/dtos/cursor-page.dto';
import { IsLikedDto, LikeCountDto } from 'src/dtos/like.dto';
import { User } from 'src/entities/user.entity';
import { CheeringSongService } from 'src/services/cheering-song.service';
import { TCheeringSongType } from 'src/types/seed.type';

@ApiTags('CheeringSong')
@Controller('cheering-songs')
@JwtAuth('access')
export class CheeringSongController {
  private readonly logger = new Logger(CheeringSongController.name);

  constructor(private readonly cheeringSongService: CheeringSongService) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '검색한 응원가 목록 및 무한 스크롤 정보 반환',
  })
  @ApiOkResponse({
    type: CursorPageCheeringSongDto,
    example: {
      data: [
        {
          id: 271,
          title: '고승민 응원가',
          lyrics_preview: '롯~데의 고승민 안타 안타~',
          team: {
            id: 1,
            name: '롯데',
          },
          player: {
            id: 134,
            name: '고승민',
            jerseyNumber: 65,
          },
          isLiked: false,
        },
        {
          id: 286,
          title: '오늘도 승리한다',
          lyrics_preview: '롯데 롯데 롯데',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 293,
          title: '마! 최강롯데 아이가',
          lyrics_preview: '워어어 워어어어 필승 롯데',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 294,
          title: '우리들의 빛나는 이 순간',
          lyrics_preview: '워 워어어어 승리를 위해',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 307,
          title: '박세혁 응원가',
          lyrics_preview: '워어우워어어 NC 박세혁 워어우워어어 NC 박세혁',
          team: {
            id: 6,
            name: 'NC',
          },
          player: {
            id: 137,
            name: '박세혁',
            jerseyNumber: 10,
          },
          isLiked: false,
        },
      ],
      meta: {
        take: 5,
        hasNextData: true,
        cursor: 307,
      },
    },
  })
  async findBySearchWithInfiniteScroll(
    @Query() cursorPageWithSearchOptionDto: CursorPageWithSearchOptionDto,
    @UserDeco() user: User,
  ): Promise<CursorPageCheeringSongDto> {
    const { take, cursor, q } = cursorPageWithSearchOptionDto;

    const cheeringSongsWithCursorMeta =
      await this.cheeringSongService.findBySearchWithInfiniteScroll(
        user,
        take,
        cursor,
        q,
      );

    return plainToInstance(
      CursorPageCheeringSongDto,
      cheeringSongsWithCursorMeta,
    );
  }

  @Get('liked/types/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '좋아요 한 응원가 목록 및 무한 스크롤 정보 반환',
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
  @ApiOkResponse({
    type: CursorPageCheeringSongDto,
    example: {
      data: [
        {
          id: 271,
          title: '고승민 응원가',
          lyrics_preview: '롯~데의 고승민 안타 안타~',
          team: {
            id: 1,
            name: '롯데',
          },
          player: {
            id: 134,
            name: '고승민',
            jerseyNumber: 65,
          },
          isLiked: true,
        },
        {
          id: 286,
          title: '오늘도 승리한다',
          lyrics_preview: '롯데 롯데 롯데',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: true,
        },
        {
          id: 293,
          title: '마! 최강롯데 아이가',
          lyrics_preview: '워어어 워어어어 필승 롯데',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: true,
        },
        {
          id: 294,
          title: '우리들의 빛나는 이 순간',
          lyrics_preview: '워 워어어어 승리를 위해',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: true,
        },
        {
          id: 307,
          title: '박세혁 응원가',
          lyrics_preview: '워어우워어어 NC 박세혁 워어우워어어 NC 박세혁',
          team: {
            id: 6,
            name: 'NC',
          },
          player: {
            id: 137,
            name: '박세혁',
            jerseyNumber: 10,
          },
          isLiked: true,
        },
      ],
      meta: {
        take: 5,
        hasNextData: true,
        cursor: 307,
      },
    },
  })
  async findByLikedWithInfiniteScroll(
    @Param('type') type: TCheeringSongType,
    @Query() cursorPageOptionDto: CursorPageOptionDto,
    @UserDeco() user: User,
  ): Promise<CursorPageCheeringSongDto> {
    const { take, cursor } = cursorPageOptionDto;

    const cheeringSongsWithCursorMeta =
      await this.cheeringSongService.findByLikedWithInfiniteScroll(
        type,
        user,
        take,
        cursor,
      );

    return plainToInstance(
      CursorPageCheeringSongDto,
      cheeringSongsWithCursorMeta,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '응원가 하나 반환' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiOkResponse({ type: CheeringSongDetailedDto })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @UserDeco() user: User,
  ): Promise<CheeringSongDetailedDto> {
    const cheeringSong = await this.cheeringSongService.findOne(id);
    const { isLiked } = await this.cheeringSongService.getCheeringSongIsLiked(
      id,
      user,
    );
    return plainToInstance(CheeringSongDetailedDto, {
      ...cheeringSong,
      isLiked,
    });
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
  @ApiOkResponse({
    type: CursorPageCheeringSongDto,
    example: {
      data: [
        {
          id: 273,
          title: '부산 갈매기',
          lyrics_preview: '빠바바빠바밤~',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 274,
          title: '돌아와요 부산항에',
          lyrics_preview: '꽃 피는 동백섬에',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 275,
          title: '바다새',
          lyrics_preview: '롯데! 롯데!',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 276,
          title: '뱃노래',
          lyrics_preview: '어기여차에애~ 어기여차에~ (워!)',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
        {
          id: 277,
          title: '승전가',
          lyrics_preview: '롯데 롯데 롯데 롯~데~',
          team: {
            id: 1,
            name: '롯데',
          },
          player: null,
          isLiked: false,
        },
      ],
      meta: {
        take: 5,
        hasNextData: true,
        cursor: 277,
      },
    },
  })
  async findByTeamAndNameWithInfiniteScroll(
    @UserDeco() user: User,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('type') type: TCheeringSongType,
    @Query() cursorPageOptionDto: CursorPageOptionDto,
  ): Promise<CursorPageCheeringSongDto> {
    const { take, cursor } = cursorPageOptionDto;

    const cheeringSongsWithCursorMeta =
      await this.cheeringSongService.findByTeamIdAndTypeWithInfiniteScroll(
        teamId,
        type,
        user,
        take,
        cursor,
      );
    return plainToInstance(
      CursorPageCheeringSongDto,
      cheeringSongsWithCursorMeta,
    );
  }

  @Post(':id/likes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '해당하는 ID의 응원가에 대한 유저의 좋아요 추가' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiCreatedResponse({
    description: '성공 시 별 다른 데이터를 반환하지 않음',
  })
  @ApiNotFoundResponse({
    description: '해당 ID의 응원가가 없을 경우',
  })
  @ApiConflictResponse({
    description: '유저가 해당 ID의 응원가에 이미 좋아요를 했을 경우',
  })
  async likeCheerSong(
    @Param('id', ParseIntPipe) cheeringSongId: number,
    @UserDeco() user: User,
  ): Promise<void> {
    await this.cheeringSongService.likeCheerSong(cheeringSongId, user);
    return;
  }

  @Delete(':id/likes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '해당하는 ID의 응원가에 대한 유저의 좋아요 취소' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiNoContentResponse({
    description: '성공 시 별 다른 데이터를 반환하지 않음',
  })
  @ApiNotFoundResponse({
    description: '해당 ID의 응원가가 없거나 좋아요를 하지 않았을 경우',
  })
  async unlikeCheerSong(
    @Param('id', ParseIntPipe) cheeringSongId: number,
    @UserDeco() user: User,
  ): Promise<void> {
    await this.cheeringSongService.unlikeCheerSong(cheeringSongId, user);
    return;
  }

  @Get(':id/likes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당하는 ID의 응원가에 대한 유저의 좋아요 여부' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiOkResponse({ type: IsLikedDto })
  @ApiNotFoundResponse({
    description: '해당 ID의 응원가가 없을 경우',
  })
  async getCheeringSongIsLiked(
    @Param('id') cheeringSongId: number,
    @UserDeco() user: User,
  ): Promise<IsLikedDto> {
    const isLikedInfo = await this.cheeringSongService.getCheeringSongIsLiked(
      cheeringSongId,
      user,
    );
    return plainToInstance(IsLikedDto, isLikedInfo);
  }

  @Get(':id/likes/total')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당하는 ID의 응원가의 좋아요 수 반환' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiOkResponse({ type: LikeCountDto })
  @ApiNotFoundResponse({
    description: '해당 ID의 응원가가 없을 경우',
  })
  async getCheeringSongLikes(
    @Param('id') cheeringSongId: number,
  ): Promise<LikeCountDto> {
    const likeCountInfo =
      await this.cheeringSongService.getCheeringSongLikes(cheeringSongId);
    return plainToInstance(LikeCountDto, likeCountInfo);
  }
}
