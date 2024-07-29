import { Module } from '@nestjs/common';
import { StadiumController } from 'src/controllers/stadium.controller';
import { StadiumService } from 'src/services/stadium.service';
@Module({
  controllers: [StadiumController],
  providers: [StadiumService],
})
export class StadiumModule {}
