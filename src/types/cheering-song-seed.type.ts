import { TTeam } from "./crawling-game.type";

export interface ICheeringSongSeed {
  type: 'team_cheer' | 'player_cheer';
  team_name: TTeam;
  title: string;
  lyrics: string;
  link: string;

  player_name?: string;
  jersey_number?: number;
  throws_bats?: string;
  position?: string;
}