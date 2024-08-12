import { TStadium } from 'src/types/crawling-game.type';

export const stadiumSeeder: {
  name: TStadium;
  full_name: string;
  lat: number;
  lng: number;
}[] = [
  {
    name: '잠실',
    full_name: '잠실종합운동장잠실야구장',
    lat: 37.511985800000055,
    lng: 127.0676545539383,
  },
  {
    name: '창원',
    full_name: '창원NC파크',
    lat: 35.22280070751199,
    lng: 128.5820053292696,
  },
  {
    name: '고척',
    full_name: '고척 스카이돔',
    lat: 37.498369399999845,
    lng: 126.86301145393881,
  },
  {
    name: '대구',
    full_name: '라이온즈파크',
    lat: 35.85044123612354,
    lng: 128.66306941096647,
  },
  {
    name: '대전',
    full_name: '이글스파크',
    lat: 36.3170789,
    lng: 127.4291345,
  },
  {
    name: '문학',
    full_name: '랜더스 필드',
    lat: 37.4370423,
    lng: 126.6932617,
  },
  {
    name: '수원',
    full_name: 'KT위즈 파크',
    lat: 37.299877225349725,
    lng: 127.0067248331916,
  },
  {
    name: '사직',
    full_name: '부산사직종합운동장 사직야구장',
    lat: 35.194017568250274,
    lng: 129.06154402103502,
  },
  {
    name: '광주',
    full_name: '광주기아챔피언스필드',
    lat: 35.16820922209541,
    lng: 126.88911206152956,
  },
];
