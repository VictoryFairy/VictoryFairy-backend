import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { UserDeco } from 'src/decorator/user.decorator';
import { User } from 'src/entities/user.entity';
import { LikeService } from 'src/services/like.service';

@ApiTags('Like')
@Controller('likes')
@JwtAuth('access')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post('cheering-songs/:id')
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
    description: '유저가 해당 ID의 응원가에 이미 좋아요를 했을 경우'
  })
  async likeCheerSong(
    @Param('id', ParseIntPipe) cheeringSongId: number,
    @UserDeco() user: User,
  ): Promise<void> {
    await this.likeService.likeCheerSong(cheeringSongId, user);
    return;
  }

  @Delete('cheering-songs/:id')
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
    return await this.likeService.unlikeCheerSong(cheeringSongId, user);
  }

  @Get('cheering-songs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당하는 ID의 응원가의 좋아요 수 반환' })
  @ApiParam({
    name: 'id',
    description: '응원가 ID',
    example: 1,
  })
  @ApiOkResponse({
    description: '해당 ID의 응원가의 좋아요 수',
    example: { count: 1 }
  })
  @ApiNotFoundResponse({
    description: '해당 ID의 응원가가 없을 경우',
  })
  async getLikes(@Param('id') cheeringSongId: number): Promise<{ count: number }> {
    return await this.likeService.getLikes(cheeringSongId);
  }
}
