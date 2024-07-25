import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScrapingController } from 'src/controllers/scraping.controller';
import { ScrapingService } from 'src/services/scraping.service';

@Module({
  imports: [HttpModule],
  controllers: [ScrapingController],
  providers: [ScrapingService],
})
export class ScrapingModule {}
