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
    type: CursorPageDto<CheeringSongDto>,
    example: {
      data: [
        {
          id: 271,
          type: 'player',
          title: '고승민 응원가',
          lyrics:
            '롯~데의 고승민 안타 안타~\n롯~데의 고승민 안타 안타~~\n워어어 워어어 워어어어~\n워어어 워어어 워어어어~\n롯~데의~ 고승민 안타 안타~',
          link: 'https://youtu.be/NstqdjNrJOw',
          player: {
            id: 169,
            name: '고승민',
            jersey_number: 65,
            position: '2루수',
            throws_bats: '우투좌타',
          },
        },
        {
          id: 286,
          type: 'team',
          title: '오늘도 승리한다',
          lyrics:
            '롯데 롯데 롯데\n워어 워어어어 워어어~\n롯데 롯데 롯데\n워어 워어어어 워어어어~\n롯데 롯데 롯데\n워어 워어어어 워어어~\n오늘도 승리한다 내일도 승리한다\n언제나 우리는 최강롯데~\n\n롯데 롯데 롯데\n워어 워어어어 워어어~\n롯데 롯데 롯데\n워어 워어어어 워어어어~\n롯데 롯데 롯데\n워어 워어어어 워어어~\n오늘도 승리한다 내일도 승리한다\n언제나 우리는 최강롯데~\n\n(간주)\n\n롯데 롯데 롯데\n워어 워어어어 워어어~\n롯데 롯데 롯데\n워어 워어어어 워어어어~\n롯데 롯데 롯데\n워어 워어어어 워어어~\n오늘도 승리한다 내일도 승리한다\n언제나 우리는 최강 롯데\n오늘도 승리한다 내일도 승리한다\n언제나 우리는 최강 롯데',
          link: 'https://youtu.be/RPJdvochneY',
          player: null,
        },
        {
          id: 293,
          type: 'team',
          title: '마! 최강롯데 아이가',
          lyrics:
            '워어어 워어어어 필승 롯데\n워어어 워어어어 롯데 자이언츠\n워어어 워어어어 필승 롯데\n워어어 워어어어 롯데 자이언츠\n\n청춘을 태워\n승리로 그라운드를 뒤덮어\n가쁜 숨과 함성\n승리를 향한 열정\n\n거친 파도처럼\n세차게 공을 던져라\n갈매기보다 더 멀리\n담장 넘어로 날아라\n\n끝날때 까지 끝나지 않는다\n승리를 향한 집념을 보아라\n오늘도 터진다 마!마! 만루홈런\n\n워어어 워어어어 날려라 홈런\n워어어 워어어어 잡아라 삼진\n워어어 워어어어 필승 롯데\n워어어 워어어어 롯데 자이언츠\n\n마! 마! 힘차게 던져라\n마! 마! 힘차게 날려라\n마! 마! 우리가 우리가\n마! 마! 최강롯데 아이가!\n\n끝날때 까지 끝나지 않는다\n승리를 향한 집념을 보아라\n오늘도 터진다 마!마! 만루홈런\n\n워어어 워어어어 날려라 홈런\n워어어 워어어어 잡아라 삼진\n워어어 워어어어 필승 롯데\n워어어 워어어어 롯데 자이언츠\n\n워어어 워어어어 날려라 홈런\n워어어 워어어어 잡아라 삼진\n워어어 워어어어 필승 롯데\n워어어 워어어어 롯데 자이언츠',
          link: 'https://youtu.be/7qhk9I2K6Jc',
          player: null,
        },
        {
          id: 294,
          type: 'team',
          title: '우리들의 빛나는 이 순간',
          lyrics:
            '워 워어어어 승리를 위해\n워어어어 큰 꿈을 향해\n워어어어 자 달려가자\n롯데 자이언츠~ (최!강!롯!데!)\n\n워 워어어어 워 워어어어\n워어어어 워 워어어어\n빛나리라 영원하라 롯데 자이언츠\n\n거친 파도 헤치며 날아오르는 그대여\n불타오른 거인의 뜨거운 심장으로\n멈추지 않고 달려가자\n나의 열정 꿈의 그라운드\n우리의 빛나는 이 순간을 기억하라\n\n워 워어어어 승리를 위해\n워어어어 큰 꿈을 향해\n워어어어 자 달려가자\n롯데 자이언츠 (최!강!롯!데!)\n\n워 워어어어 워 워어어어\n워어어어 워 워어어어\n빛나리라 영원하라 롯데 자이언츠',
          link: 'https://youtu.be/K9xm7kaV6MA',
          player: null,
        },
        {
          id: 307,
          type: 'player',
          title: '박세혁 응원가',
          lyrics:
            '워어우워어어 NC 박세혁 워어우워어어 NC 박세혁\n워우워~ 안방마님 박세혁! 워우워~ 다이노스 박세혁!',
          link: 'https://youtu.be/co08QIacru8',
          player: {
            id: 172,
            name: '박세혁',
            jersey_number: 10,
            position: '포수',
            throws_bats: '우투좌타',
          },
        },
      ],
      meta: {
        take: 5,
        hasNextData: true,
        cursor: 255,
      },
    },
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
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
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
  @ApiOkResponse({
    type: CursorPageDto<CheeringSongDto>,
    example: {
      data: [
        {
          id: 273,
          type: 'team',
          title: '부산 갈매기',
          lyrics:
            '빠바바빠바밤~\n빠바바빠바밤~\n빠바바빰빰빰~\n\n지금은 그 어디서 (최~강 롯데!)\n내 생각 잊었는가 (최~강 롯데!)\n꽃처럼 어여쁜 그 이름도\n고왔던 순이 순이야\n\n파도치는 부둣가에\n지나간 일들이 가슴에 남았는데\n\n부산 갈~매기~ 부산 갈~매기~\n너는 정녕 나를 잊었나\n\n빠바바빠바밤~\n빠바바빠바밤~\n빠바바빰빰빰~',
          link: 'https://youtu.be/V0b9WKYZ59s',
          player: null,
        },
        {
          id: 274,
          type: 'team',
          title: '돌아와요 부산항에',
          lyrics:
            '꽃 피는 동백섬에\n봄이 왔건만 (최~강롯데!)\n형제 떠난 부산항에(울산항에)\n갈매기만 슬피 우네 (최~강롯데!)\n\n오륙도 돌아가는 연락선마다\n목메어 불러봐도\n대답 없는 내 형제여\n\n돌아와요 부산항에(울산항에)\n그리운 내 형제여',
          link: 'https://youtu.be/62jAw0CHZKA',
          player: null,
        },
        {
          id: 275,
          type: 'team',
          title: '바다새',
          lyrics:
            '롯데! 롯데!\n최!강!롯!데!\n\n어두운 바닷가\n홀로 나는 새야 (새야)\n갈 곳을 잃었나\n하얀 바다새야 (우우우)\n힘없는 소리로\n홀로 우는 새야 (새야)\n내 짝을 잃었나\n하얀 바다새야 (우우우)\n\n롯데! 최!강!롯!데!\n\n모두 다 가고 없는데\n바다도 잠이 드는데\n새는 왜 날개짓하며\n저렇게 날아만 다닐까\n새야~ 해지고 어두운데\n새야~ 어디로 떠나갈까\n새야~ 날마저 기우는데\n새야~ 아픈 맘 어이 하나\n\n아아아아 새야\n아아아아 새야\n우우우 새야\n우우우 새야~ 새야~ 아~아~',
          link: 'https://youtu.be/EkIgSyeqCLk',
          player: null,
        },
        {
          id: 276,
          type: 'team',
          title: '뱃노래',
          lyrics:
            '어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)\n어기야 디여~차~ (어기여차~)\n어기야 디여~ 어기 여차! 승리로 가~ 잔다~\n어기야 디여~차~ (어기여차~)\n어기야 디여~ 어기 여차! 승리로 가~ 잔다~\n\n오~ 오오~ 오오~ 오오~ 오오오~\n오~ 오오오~ 오오~ 오오~ 오오~ 오오오~\n\n어기야 디여~차~ (어기여차~)\n어기야 디여~ 어기 여차!\n승리로 가~ 잔다~\n어기야 디여~차~ (어기여차~)\n어기야 디여~ 어기 여차!\n승리로 가~ 잔다~\n어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)\n어기여차에애~ 어기여차에~ (워!)',
          link: 'https://youtu.be/vd7zBbhRiJg',
          player: null,
        },
        {
          id: 277,
          type: 'team',
          title: '승전가',
          lyrics:
            '롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n승리의 롯데! (화이팅!)\n\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n승리의 롯데! (화이팅!)\n\n승리의~ 노래를~\n랄라랄라랄라랄라랄라 롯데 자이언츠\n승리의~ 노래를~\n랄라랄라랄라랄라랄라 롯데 자이언츠\n\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n승리의 롯데! (화이팅!)\n\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n롯데 롯데 롯데 롯~데~\n승리의 롯데! (화이팅!)',
          link: 'https://youtu.be/NSR5kAxIEi0',
          player: null,
        },
      ],
      meta: {
        take: 5,
        hasNextData: true,
        cursor: 255,
      },
    },
  })
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
