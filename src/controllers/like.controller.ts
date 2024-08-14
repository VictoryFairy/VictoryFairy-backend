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
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { UserDeco } from 'src/decorator/user.decorator';
import { IsLikedDto, LikeCountDto } from 'src/dtos/like.dto';
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
    description: '유저가 해당 ID의 응원가에 이미 좋아요를 했을 경우',
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
    await this.likeService.unlikeCheerSong(cheeringSongId, user);
    return;
  }

  @Get('cheering-songs/:id')
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
    const isLikedInfo = await this.likeService.getCheeringSongIsLiked(
      cheeringSongId,
      user,
    );
    return plainToInstance(IsLikedDto, isLikedInfo);
  }

  @Get('cheering-songs/:id/total')
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
      await this.likeService.getCheeringSongLikes(cheeringSongId);
    return plainToInstance(LikeCountDto, likeCountInfo);
  }
}
