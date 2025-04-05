import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/common/decorators/jwt-token.decorator';
import { StadiumDto } from 'src/modules/stadium/dto/stadium.dto';
import { StadiumService } from 'src/modules/stadium/stadium.service';

@ApiTags('Stadium')
@Controller('stadiums')
@JwtAuth('access')
export class StadiumController {
  constructor(private readonly stadiumService: StadiumService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '모든 경기장 혹은 해당 이름의 경기장 정보 반환' })
  @ApiQuery({
    name: 'name',
    description: '경기장 이름',
    type: String,
    required: false,
  })
  @ApiOkResponse({
    type: [StadiumDto],
    description: '정보가 없어도 빈 배열 반환',
  })
  async findAll(@Query('name') name?: string): Promise<StadiumDto[]> {
    const stadiums = await this.stadiumService.findAll(name);
    return plainToInstance(StadiumDto, stadiums);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '해당하는 ID의 경기장 정보 반환' })
  @ApiParam({
    name: 'id',
    description: '경기장 ID',
    example: 1,
  })
  @ApiOkResponse({ type: StadiumDto })
  @ApiNotFoundResponse({ description: '해당하는 ID의 경기장이 없을 경우' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StadiumDto> {
    const stadium = await this.stadiumService.findOne(id);
    return plainToInstance(StadiumDto, stadium);
  }
}
