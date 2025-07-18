export const correctDailyGameListExample = {
  games: {
    LGSS: [
      {
        id: '20250511LGSS0',
        date: '2025-05-11',
        time: '14:00:00',
        status: '경기종료',
        gameType: 0,
        homeTeam: {
          id: 4,
          name: '삼성 라이온즈',
        },
        awayTeam: {
          id: 7,
          name: 'LG 트윈스',
        },
        stadium: {
          id: 4,
          name: '대구',
          fullName: '라이온즈파크',
          latitude: 35.85044123612354,
          longitude: 128.66306941096647,
        },
        homeTeamScore: 4,
        awayTeamScore: 7,
        winningTeam: {
          id: 7,
          name: 'LG 트윈스',
        },
      },
    ],
    HHWO: [
      {
        id: '20250511HHWO0',
        date: '2025-05-11',
        time: '14:00:00',
        status: '경기종료',
        gameType: 0,
        homeTeam: {
          id: 8,
          name: '키움 히어로즈',
        },
        awayTeam: {
          id: 10,
          name: '한화 이글스',
        },
        stadium: {
          id: 3,
          name: '고척',
          fullName: '고척 스카이돔',
          latitude: 37.498369399999845,
          longitude: 126.86301145393881,
        },
        homeTeamScore: 0,
        awayTeamScore: 8,
        winningTeam: {
          id: 10,
          name: '한화 이글스',
        },
      },
    ],
    NCOB: [
      {
        id: '20250511NCOB1',
        date: '2025-05-11',
        time: '14:00:00',
        status: '경기종료',
        gameType: 1,
        homeTeam: {
          id: 2,
          name: '두산 베어스',
        },
        awayTeam: {
          id: 6,
          name: 'NC 다이노스',
        },
        stadium: {
          id: 1,
          name: '잠실',
          fullName: '잠실종합운동장잠실야구장',
          latitude: 37.511985800000055,
          longitude: 127.0676545539383,
        },
        homeTeamScore: 5,
        awayTeamScore: 11,
        winningTeam: {
          id: 6,
          name: 'NC 다이노스',
        },
      },
      {
        id: '20250511NCOB2',
        date: '2025-05-11',
        time: '17:00:00',
        status: '경기종료',
        gameType: 2,
        homeTeam: {
          id: 2,
          name: '두산 베어스',
        },
        awayTeam: {
          id: 6,
          name: 'NC 다이노스',
        },
        stadium: {
          id: 1,
          name: '잠실',
          fullName: '잠실종합운동장잠실야구장',
          latitude: 37.511985800000055,
          longitude: 127.0676545539383,
        },
        homeTeamScore: 2,
        awayTeamScore: 5,
        winningTeam: {
          id: 6,
          name: 'NC 다이노스',
        },
      },
    ],
    HTSK: [
      {
        id: '20250511HTSK1',
        date: '2025-05-11',
        time: '14:00:00',
        status: '경기종료',
        gameType: 1,
        homeTeam: {
          id: 5,
          name: 'SSG 랜더스',
        },
        awayTeam: {
          id: 3,
          name: 'KIA 타이거즈',
        },
        stadium: {
          id: 6,
          name: '문학',
          fullName: '랜더스 필드',
          latitude: 37.4370423,
          longitude: 126.6932617,
        },
        homeTeamScore: 8,
        awayTeamScore: 4,
        winningTeam: {
          id: 5,
          name: 'SSG 랜더스',
        },
      },
      {
        id: '20250511HTSK2',
        date: '2025-05-11',
        time: '17:00:00',
        status: '경기종료',
        gameType: 2,
        homeTeam: {
          id: 5,
          name: 'SSG 랜더스',
        },
        awayTeam: {
          id: 3,
          name: 'KIA 타이거즈',
        },
        stadium: {
          id: 6,
          name: '문학',
          fullName: '랜더스 필드',
          latitude: 37.4370423,
          longitude: 126.6932617,
        },
        homeTeamScore: 5,
        awayTeamScore: 1,
        winningTeam: {
          id: 5,
          name: 'SSG 랜더스',
        },
      },
    ],
    LTKT: [
      {
        id: '20250511LTKT1',
        date: '2025-05-11',
        time: '14:00:00',
        status: '경기종료',
        gameType: 1,
        homeTeam: {
          id: 9,
          name: 'KT 위즈',
        },
        awayTeam: {
          id: 1,
          name: '롯데 자이언츠',
        },
        stadium: {
          id: 7,
          name: '수원',
          fullName: 'KT위즈 파크',
          latitude: 37.299877225349725,
          longitude: 127.0067248331916,
        },
        homeTeamScore: 1,
        awayTeamScore: 6,
        winningTeam: {
          id: 1,
          name: '롯데 자이언츠',
        },
      },
      {
        id: '20250511LTKT2',
        date: '2025-05-11',
        time: '17:00:00',
        status: '경기종료',
        gameType: 2,
        homeTeam: {
          id: 9,
          name: 'KT 위즈',
        },
        awayTeam: {
          id: 1,
          name: '롯데 자이언츠',
        },
        stadium: {
          id: 7,
          name: '수원',
          fullName: 'KT위즈 파크',
          latitude: 37.299877225349725,
          longitude: 127.0067248331916,
        },
        homeTeamScore: 1,
        awayTeamScore: 1,
        winningTeam: null,
      },
    ],
  },
  registeredGameIds: [],
};

export const correctGameExample = {
  id: '20250511LTKT1',
  date: '2025-05-11',
  time: '14:00:00',
  status: '경기종료',
  gameType: 1,
  homeTeam: {
    id: 9,
    name: 'KT 위즈',
  },
  awayTeam: {
    id: 1,
    name: '롯데 자이언츠',
  },
  stadium: {
    id: 7,
    name: '수원',
    fullName: 'KT위즈 파크',
    latitude: 37.299877225349725,
    longitude: 127.0067248331916,
  },
  homeTeamScore: 1,
  awayTeamScore: 6,
  winningTeam: {
    id: 1,
    name: '롯데 자이언츠',
  },
};
