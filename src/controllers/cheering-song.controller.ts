import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CheeringSongDto } from 'src/dtos/cheering-song.dto';
import { CheeringSongService } from 'src/services/cheering-song.service';

@ApiTags('CheeringSong')
@Controller('cheering-songs')
export class CheeringSongController {
  constructor(private readonly cheeringSongService: CheeringSongService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [CheeringSongDto] })
  async findAll(): Promise<CheeringSongDto[]> {
    const cheeringSongs = await this.cheeringSongService.findAll();
    return plainToInstance(CheeringSongDto, cheeringSongs);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheeringSongDto })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CheeringSongDto> {
    const cheeringSong = await this.cheeringSongService.findOne(id);
    return plainToInstance(CheeringSongDto, cheeringSong);
  }
}
