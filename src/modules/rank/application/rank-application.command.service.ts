import { Injectable } from '@nestjs/common';
import { RankCoreService } from '../core/rank-core.service';

@Injectable()
export class RankApplicationCommandService {
  constructor(private readonly rankCoreService: RankCoreService) {}
}
