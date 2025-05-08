import { ApiProperty } from '@nestjs/swagger';

export class OppTeamDto {
  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  win: number;
}

export class ResOverallOppTeamDto {
  @ApiProperty({ example: 5 })
  totalWin: number;

  @ApiProperty({ example: 3 })
  homeWin: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        win: { type: 'number' },
      },
    },
    example: {
      '2': { total: 1, win: 1 },
      '5': { total: 1, win: 1 },
    },
  })
  oppTeam: Record<string, OppTeamDto>;
}
