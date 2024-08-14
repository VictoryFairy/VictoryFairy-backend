import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuth } from 'src/decorator/jwt-token.decorator';
import { ParkingInfoDto } from 'src/dtos/parking-info.dto';
import { ParkingInfoService } from 'src/services/parking-info.service';

@ApiTags('ParkingInfo')
@Controller('parking-infos')
@JwtAuth('access')
export class ParkingInfoController {
  constructor(private readonly parkingInfoService: ParkingInfoService) {}

  @Get('stadium/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '경기장 ID로 주변 주차장 반환' })
  @ApiParam({ name: 'id', type: Number, description: '경기장 ID', example: 1 })
  @ApiOkResponse({
    type: [ParkingInfoDto],
    description: '경기장 ID가 유효하면 주차장 정보가 없어도 빈 배열은 반환',
  })
  @ApiNotFoundResponse({
    description: '주어진 ID에 해당하는 경기장이 없을 경우',
  })
  async findByStadiumId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ParkingInfoDto[]> {
    const parkingInfos = await this.parkingInfoService.findByStadiumId(id);
    return plainToInstance(ParkingInfoDto, parkingInfos);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '모든 주차장 반환' })
  @ApiOkResponse({
    type: [ParkingInfoDto],
    description: '주차장 정보가 없어도 빈 배열은 반환',
  })
  async findAll(): Promise<ParkingInfoDto[]> {
    const parkingInfos = await this.parkingInfoService.findAll();
    return plainToInstance(ParkingInfoDto, parkingInfos);
  }
}
