import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { StadiumDto } from 'src/dtos/stadium.dto';
import { StadiumService } from 'src/services/stadium.service';

@Controller('stadiums')
export class StadiumController {
  constructor(private readonly stadiumService: StadiumService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [StadiumDto] })
  async findAll(@Query('name') name?: string): Promise<StadiumDto[]> {
    const stadiums = await this.stadiumService.findAll(name);
    return plainToInstance(StadiumDto, stadiums);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: StadiumDto })
  @ApiNotFoundResponse()
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StadiumDto> {
    const stadium = await this.stadiumService.findOne(id);
    return plainToInstance(StadiumDto, stadium);
  }
}
