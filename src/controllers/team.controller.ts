import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TeamService } from 'src/services/team.service';

@ApiTags('Team')
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}
}
