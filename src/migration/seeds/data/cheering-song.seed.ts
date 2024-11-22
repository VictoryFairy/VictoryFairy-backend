import * as samsungTeamSong from './refined-cheering-songs/samsung.team.song.json';
import * as samsungPlayerSong from './refined-cheering-songs/samsung.player.song.json';
import * as ssgTeamSong from './refined-cheering-songs/ssg.team.song.json';
import * as ssgPlayerSong from './refined-cheering-songs/ssg.player.song.json';
import * as ncTeamSong from './refined-cheering-songs/nc.team.song.json';
import * as ncPlayerSong from './refined-cheering-songs/nc.player.song.json';
import * as lotteTeamSong from './refined-cheering-songs/lotte.team.song.json';
import * as lottePlayerSong from './refined-cheering-songs/lotte.player.song.json';
import * as doosanPlayerSong from './refined-cheering-songs/doosan.player.song.json';
import * as doosanTeamSong from './refined-cheering-songs/doosan.team.song.json';
import * as hanhwaPlayerSong from './refined-cheering-songs/hanhwa.player.song.json';
import * as hanhwaTeamSong from './refined-cheering-songs/hanhwa.team.song.json';
import * as kiaPlayerSong from './refined-cheering-songs/kia.player.song.json';
import * as kiaTeamSong from './refined-cheering-songs/kia.team.song.json';
import * as kiwoomPlayerSong from './refined-cheering-songs/kiwoom.player.song.json';
import * as kiwoomTeamSong from './refined-cheering-songs/kiwoom.team.song.json';
import * as ktPlayerSong from './refined-cheering-songs/kt.player.song.json';
import * as ktTeamSong from './refined-cheering-songs/kt.team.song.json';
import * as lgPlayerSong from './refined-cheering-songs/lg.player.song.json';
import * as lgTeamSong from './refined-cheering-songs/lg.team.song.json';
import { ICheeringSongSeed } from 'src/types/seed.type';

export const refinedCheeringSongs: ICheeringSongSeed[] = samsungTeamSong
  .concat(samsungPlayerSong)
  .concat(ssgTeamSong)
  .concat(ssgPlayerSong)
  .concat(ncTeamSong)
  .concat(ncPlayerSong)
  .concat(lotteTeamSong)
  .concat(lottePlayerSong)
  .concat(doosanPlayerSong)
  .concat(doosanTeamSong)
  .concat(hanhwaPlayerSong)
  .concat(hanhwaTeamSong)
  .concat(kiaPlayerSong)
  .concat(kiaTeamSong)
  .concat(kiwoomPlayerSong)
  .concat(kiwoomTeamSong)
  .concat(ktPlayerSong)
  .concat(ktTeamSong)
  .concat(lgPlayerSong)
  .concat(lgTeamSong) as ICheeringSongSeed[];
