import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRegisteredGameDto } from './req-create-registered-game.dto';

export class UpdateRegisteredGameDto extends PartialType(
  OmitType(CreateRegisteredGameDto, ['gameId'] as const),
) {}
