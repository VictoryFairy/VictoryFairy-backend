import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { SchedulingService } from 'src/services/scheduling.service';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // @Post('test')
  // @ApiBody({
  //   schema: {
  //     example: {
  //       id: '20240823LTSS0',
  //       startTime: '15:12:00',
  //     },
  //   },
  // })
  // async test(@Body('id') id: string, @Body('startTime') startTime: string) {
  //   return this.schedulingService.setupGameUpdateScheduler(id, startTime);
  // }
}
