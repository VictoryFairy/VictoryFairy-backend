import * as fs from 'fs';
import { ICheeringSongSeed } from 'src/types/seed.type';
import * as samsungTeamSong from './raw-cheering-songs/samsung.team.song.json';
import * as samsungPlayerSong from './raw-cheering-songs/samsung.player.song.json';
import * as ssgTeamSong from './raw-cheering-songs/ssg.team.song.json';
import * as ssgPlayerSong from './raw-cheering-songs/ssg.player.song.json';
import * as ncTeamSong from './raw-cheering-songs/nc.team.song.json';
import * as ncPlayerSong from './raw-cheering-songs/nc.player.song.json';
import * as lotteTeamSong from './raw-cheering-songs/lotte.team.song.json';
import * as lottePlayerSong from './raw-cheering-songs/lotte.player.song.json';
import * as doosanPlayerSong from './raw-cheering-songs/doosan.player.song.json';
import * as doosanTeamSong from './raw-cheering-songs/doosan.team.song.json';
import * as hanhwaPlayerSong from './raw-cheering-songs/hanhwa.player.song.json';
import * as hanhwaTeamSong from './raw-cheering-songs/hanhwa.team.song.json';
import * as kiaPlayerSong from './raw-cheering-songs/kia.player.song.json';
import * as kiaTeamSong from './raw-cheering-songs/kia.team.song.json';
import * as kiwoomPlayerSong from './raw-cheering-songs/kiwoom.player.song.json';
import * as kiwoomTeamSong from './raw-cheering-songs/kiwoom.team.song.json';
import * as ktPlayerSong from './raw-cheering-songs/kt.player.song.json';
import * as ktTeamSong from './raw-cheering-songs/kt.team.song.json';
import * as lgPlayerSong from './raw-cheering-songs/lg.player.song.json';
import * as lgTeamSong from './raw-cheering-songs/lg.team.song.json';

function refineSamsungTeamSong() {
  const type = 'team_cheer';
  const team_name = '삼성';

  const parsedData = samsungTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem[type].title,
    lyrics: elem[type].lyrics,
    link: elem[type].link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/samsung.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineSamsungPlayerSong() {
  const type = 'player_cheer';
  const team_name = '삼성';

  const parsedData = samsungPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/samsung.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineSsgTeamSong() {
  const type = 'team_cheer';
  const team_name = 'SSG';

  const parsedData = ssgTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem[type].title,
    lyrics: elem[type].lyrics,
    link: elem[type].link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/ssg.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineSsgPlayerSong() {
  const type = 'player_cheer';
  const team_name = 'SSG';

  const parsedData = ssgPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/ssg.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineNcTeamSong() {
  const type = 'team_cheer';
  const team_name = 'NC';

  const parsedData = ncTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.title,
    lyrics: elem.lyrics,
    link: elem.link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/nc.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineNcPlayerSong() {
  const type = 'team_cheer';
  const team_name = 'NC';

  const parsedData = ncPlayerSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.player_name + ' 응원가',
    lyrics: elem.lyrics,
    link: elem.link,
    player_name: elem.player_name,
    jersey_number: elem.jersey_number,
    throws_bats: elem.throws_bats,
    position: elem.position,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/nc.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineLotteTeamSong() {
  const type = 'team_cheer';
  const team_name = '롯데';

  const parsedData = lotteTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.title,
    lyrics: elem.lyrics,
    link: elem.link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/lotte.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineLottePlayerSong() {
  const type = 'team_cheer';
  const team_name = '롯데';

  const parsedData = lottePlayerSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.player_name + ' 응원가',
    lyrics: elem.lyrics,
    link: elem.link,
    player_name: elem.player_name,
    jersey_number: elem.jersey_number,
    throws_bats: elem.throws_bats,
    position: elem.position,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/lotte.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineLgTeamSong() {
  const type = 'team_cheer';
  const team_name = 'LG';

  const parsedData = lgTeamSong['team_cheer'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.title,
      lyrics: elem.lyrics,
      link: elem.link,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/lg.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineLgPlayerSong() {
  const type = 'player_cheer';
  const team_name = 'LG';

  const parsedData = lgPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/lg.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKtTeamSong() {
  const type = 'team_cheer';
  const team_name = 'KT';

  const parsedData = ktTeamSong['team_cheer'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.title,
      lyrics: elem.lyrics,
      link: elem.link,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kt.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKtPlayerSong() {
  const type = 'player_cheer';
  const team_name = 'KT';

  const parsedData = ktPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kt.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKiwoomTeamSong() {
  const type = 'team_cheer';
  const team_name = '키움';

  const parsedData = kiwoomTeamSong['team_cheer'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.title,
      lyrics: elem.lyrics,
      link: elem.link,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kiwoom.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKiwoomPlayerSong() {
  const type = 'player_cheer';
  const team_name = '키움';

  const parsedData = kiwoomPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kiwoom.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKiaTeamSong() {
  const type = 'team_cheer';
  const team_name = 'KIA';

  const parsedData = kiaTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.title,
    lyrics: elem.lyrics,
    link: elem.link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kia.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineKiaPlayerSong() {
  const type = 'player_cheer';
  const team_name = 'KIA';

  const parsedData = kiaPlayerSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem.player_name + ' 응원가',
    lyrics: elem.lyrics,
    link: elem.link,
    player_name: elem.player_name,
    jersey_number: elem.jersey_number,
    throws_bats: elem.throws_bats,
    position: elem.position,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/kia.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineHanhwaTeamSong() {
  const type = 'team_cheer';
  const team_name = '한화';

  const parsedData = hanhwaTeamSong.map<ICheeringSongSeed>((elem: any) => ({
    type,
    team_name,
    title: elem[type].title,
    lyrics: elem[type].lyrics,
    link: elem[type].link,
  }));

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/hanhwa.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineHanhwaPlayerSong() {
  const type = 'player_cheer';
  const team_name = '한화';

  const parsedData = hanhwaPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/hanhwa.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineDoosanTeamSong() {
  const type = 'team_cheer';
  const team_name = '두산';

  const parsedData = doosanTeamSong['team_cheer'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.title,
      lyrics: elem.lyrics,
      link: elem.link,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/doosan.team.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

function refineDoosanPlayerSong() {
  const type = 'player_cheer';
  const team_name = '두산';

  const parsedData = doosanPlayerSong['player_cheers'].map<ICheeringSongSeed>(
    (elem: any) => ({
      type,
      team_name,
      title: elem.player_name + ' 응원가',
      lyrics: elem.lyrics,
      link: elem.link,
      player_name: elem.player_name,
      jersey_number: elem.jersey_number,
      throws_bats: elem.throws_bats,
      position: elem.position,
    }),
  );

  fs.writeFileSync(
    'src/seeds/refined-cheering-songs/doosan.player.song.json',
    JSON.stringify(parsedData, null, 2),
    'utf-8',
  );
}

refineSamsungTeamSong();
refineSamsungPlayerSong();
refineSsgTeamSong();
refineSsgPlayerSong();
refineNcTeamSong();
refineNcPlayerSong();
refineLotteTeamSong();
refineLottePlayerSong();
refineLgTeamSong();
refineLgPlayerSong();
refineKtTeamSong();
refineKtPlayerSong();
refineKiwoomTeamSong();
refineKiwoomPlayerSong();
refineKiaTeamSong();
refineKiaPlayerSong();
refineHanhwaTeamSong();
refineHanhwaPlayerSong();
refineDoosanTeamSong();
refineDoosanPlayerSong();
