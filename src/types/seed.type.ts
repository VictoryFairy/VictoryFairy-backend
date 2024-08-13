import { TStadium, TTeam } from './crawling-game.type';

export interface ICheeringSongSeed {
  type: TCheeringSongType;
  team_name: TTeam;
  title: string;
  lyrics: string;
  link: string;

  player_name?: string;
  jersey_number?: number;
  throws_bats?: string;
  position?: string;
}

export type TCheeringSongType = 'team' | 'player';

export interface IParkingInfoSeed {
  stadium: TStadium;
  address: string;
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  link: string;
}

export interface IStadiumSeed {
  name: TStadium;
  full_name: string;
  lat: number;
  lng: number;
}
