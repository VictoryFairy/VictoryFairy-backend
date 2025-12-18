import { Injectable } from '@nestjs/common';
import { TeamCoreService } from '../core/team-core.service';

@Injectable()
export class TeamCommandService {
  constructor(private readonly teamCoreService: TeamCoreService) {}
}
