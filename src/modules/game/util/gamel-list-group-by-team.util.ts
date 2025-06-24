import { GameDto } from '../dto/game.dto';

export function groupGamesByTeam(games: GameDto[]): Record<string, GameDto[]> {
  const map: Record<string, GameDto[]> = {};

  for (const game of games) {
    const key = game.id.slice(8, -1);

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(game);
  }

  return map;
}
