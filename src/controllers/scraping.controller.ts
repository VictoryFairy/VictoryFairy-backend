import { Controller, Get } from '@nestjs/common';
import { ScrapingService } from 'src/services/scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get()
  getHello() {
    return this.scrapingService.getData();
  }
}
