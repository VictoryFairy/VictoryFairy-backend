import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { initializeTransactionalContext } from 'typeorm-transactional';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CustomThrottlerGuard } from 'src/common/guard/custom-throttler.guard';
import { requestWithDefault } from './utils/request-with-default';
import { TestAppModule } from './test.module';
import {
  correctDailyGameListExample,
  correctGameExample,
} from './mock/data/correct-game-example';
import { RegisteredGameStatus } from 'src/modules/registered-game/core/types/registered-game-status.type';
import { getTestUsers } from './mock/data/mock-users';
import { getGameType } from 'src/common/utils/getGameType';

describe('Core User Action Flow(e2e)', () => {
  // 테스트에 필요한 변수 선언
  let app: NestExpressApplication;
  let accessTokenList = []; // 로그인 후 발급받은 토큰 저장 배열
  const mockUserList = getTestUsers(); // 테스트 유저 데이터
  let createdRegisteredGameId: number; // 직관 등록 후 생성된 ID
  // 테스트용 게임 데이터
  const targetGame = Object.values(correctDailyGameListExample.games)
    .flat()
    .find((game) => game.id === '20250511LTKT1');

  const targetTestedUser = {
    id: 1,
    email: 'test1@example.com',
    teamId: 1,
  };

  beforeAll(async () => {
    // 트랜잭션 컨텍스트 초기화
    initializeTransactionalContext();

    // 테스트 모듈 생성
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideGuard(CustomThrottlerGuard)
      .useValue(() => true) // 요청 제한 가드 비활성화
      .compile();
    app = module.createNestApplication();

    // 앱 설정
    app.set('trust proxy', true);
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 앱 초기화 및 캐싱 대기
    await app.init();
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 초기 캐싱 이벤트 기다리기
  });

  afterAll(async () => {
    accessTokenList = [];
    await app.close();
  });

  describe('통합 테스트 흐름', () => {
    it('1. Health Check', () => {
      return requestWithDefault(app, 'get', '/')
        .expect(HttpStatus.OK)
        .expect('Hello World!');
    });

    it('2. 회원가입 성공', async () => {
      // 모든 테스트 유저에 대해 회원가입 진행
      for (const mockUser of mockUserList) {
        await requestWithDefault(app, 'post', '/users/signup')
          .send(mockUser)
          .expect(HttpStatus.CREATED);
      }
    });

    it('3. 로그인 실패', () => {
      return requestWithDefault(app, 'post', '/auth/login')
        .send({
          email: mockUserList[0].email,
          password: 'wrong-password',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('4. 로그인 성공 후 토큰 발급', async () => {
      // 모든 테스트 유저에 대해 로그인 진행
      for (const mockUser of mockUserList) {
        const res = await requestWithDefault(app, 'post', '/auth/login')
          .send({
            email: mockUser.email,
            password: mockUser.password,
          })
          .expect(HttpStatus.OK);

        // 응답 검증
        expect(res.body).toHaveProperty('acToken');
        expect(res.body).toHaveProperty('teamId');
        expect(res.body).toHaveProperty('teamName');
        accessTokenList.push(res.body.acToken); // 토큰 저장
      }
    });

    it('5. 게임 리스트 조회 성공', () => {
      const searchParams = {
        year: '2025',
        month: '5',
        day: '11',
      };
      return requestWithDefault(app, 'get', '/games/daily')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .query(searchParams)
        .expect((res) => {
          // 정렬 후 비교하여 모든 게임 데이터가 올바르게 조회되는지 확인
          expect(res.body).toEqual(correctDailyGameListExample);
        });
    });

    it('6. 게임 아이디로 조회 성공', () => {
      const gameId = correctGameExample.id;
      return requestWithDefault(app, 'get', `/games/${gameId}`)
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect((res) => {
          // 특정 게임 데이터가 올바르게 조회되는지 확인
          expect(res.body).toEqual(correctGameExample);
        });
    });

    it('7. 직관 등록 성공', async () => {
      const res = await requestWithDefault(app, 'post', '/registered-games')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          seat: '115블록 2열 13번',
          review: '좋았다',
          gameId: targetGame.id,
          cheeringTeamId: targetTestedUser.teamId, // 1번 팀을 응원
        })
        .expect(HttpStatus.CREATED);

      // 응답 필드 검증
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('seat', '115블록 2열 13번');
      expect(res.body).toHaveProperty('review', '좋았다');
      expect(res.body).toHaveProperty('status', RegisteredGameStatus.Win); // 응원팀이 이겼으므로 Win
      expect(res.body).toHaveProperty('game', {
        id: targetGame.id,
        gameType: getGameType(targetGame.id),
        date: targetGame.date,
        time: targetGame.time,
        status: targetGame.status,
        stadium: {
          id: targetGame.stadium.id,
          name: targetGame.stadium.name,
          latitude: targetGame.stadium.latitude,
          longitude: targetGame.stadium.longitude,
        },
      });
      expect(res.body).toHaveProperty('cheeringTeam', {
        id: targetGame.awayTeam.id,
        name: targetGame.awayTeam.name,
      });
      createdRegisteredGameId = res.body.id; // 다음 테스트를 위해 ID 저장
    });

    it('8. 직관 등록 후 날짜로 게임 경기 리스트 조회 시 직관등록한 게임 포함 여부 확인', () => {
      const searchParams = {
        year: '2025',
        month: '5',
        day: '11',
      };
      return requestWithDefault(app, 'get', '/games/daily')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .query(searchParams)
        .expect((res) => {
          // 정렬 후 비교하여 모든 게임 데이터가 올바르게 조회되는지 확인
          expect(res.body).toEqual({
            games: correctDailyGameListExample.games,
            registeredGameIds: [targetGame.id],
          });
        });
    });

    it('9. 같은 경기 직관 등록 중복 실패', () => {
      return requestWithDefault(app, 'post', '/registered-games')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          seat: '115블록 2열 13번',
          review: '좋았다',
          gameId: targetGame.id,
          cheeringTeamId: targetGame.awayTeam.id,
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('10. 유저 통계 확인', async () => {
      const res = await requestWithDefault(app, 'get', '/users/me')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.OK);

      // 유저 객체 검증
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email', mockUserList[0].email);
      expect(res.body.user).toHaveProperty(
        'nickname',
        mockUserList[0].nickname,
      );
      expect(res.body.user).toHaveProperty('image');
      expect(res.body.user).toHaveProperty('provider', []);
      expect(res.body.user).toHaveProperty('primaryProvider', null);

      // 기록 객체 검증
      expect(res.body).toHaveProperty('record');
      expect(res.body.record).toHaveProperty('win', 1);
      expect(res.body.record).toHaveProperty('lose', 0);
      expect(res.body.record).toHaveProperty('tie', 0);
      expect(res.body.record).toHaveProperty('cancel', 0);
      expect(res.body.record).toHaveProperty('total', 1);
      expect(res.body.record).toHaveProperty('score', 1010);
    });

    it('11. 응원가 좋아요', () => {
      return requestWithDefault(app, 'post', '/cheering-songs/1/likes')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.CREATED);
    });

    it('12. 이미 좋아요 한 경우 중복 실패', () => {
      return requestWithDefault(app, 'post', '/cheering-songs/1/likes')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.CONFLICT);
    });

    it('13. 전체 랭킹 조회 성공', () => {
      return requestWithDefault(app, 'get', '/rankings')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect((res) => {
          // 랭킹 데이터 검증
          expect(res.body.length).toBe(20);
          expect(res.body[0].nickname).toBe(mockUserList[0].nickname);
        });
    });

    it('14. 팀 랭킹 조회 성공', async () => {
      const testUser = mockUserList[0];
      const res = await requestWithDefault(app, 'get', '/rankings?teamId=1')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.OK);

      // 팀별 랭킹 데이터 검증
      expect(res.body.length).toBe(11);
      expect(res.body[0]).toHaveProperty('rank', 1);
      expect(res.body[0]).toHaveProperty('score', 1010);
      expect(res.body[0]).toHaveProperty('nickname', testUser.nickname);
      expect(res.body[0]).toHaveProperty('image');
      expect(res.body[0]).toHaveProperty('userId');
    });

    it('15. 유저 프로필 변경', () => {
      return requestWithDefault(app, 'patch', '/users/profile')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          field: 'nickname',
          value: `${mockUserList[0].nickname}-changed`,
        })
        .expect(HttpStatus.NO_CONTENT);
    });

    it('16. 유저 프로필 닉네임 중복된 경우', () => {
      return requestWithDefault(app, 'patch', '/users/profile')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          field: 'nickname',
          value: `${mockUserList[0].nickname}-changed`,
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('17. 응원가 좋아요 취소', () => {
      return requestWithDefault(app, 'delete', '/cheering-songs/1/likes')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('18. 응원가 좋아요 취소 실패 (존재하지 않음)', () => {
      return requestWithDefault(app, 'delete', '/cheering-songs/3/likes')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('19. 직관 등록 삭제 성공', () => {
      return requestWithDefault(
        app,
        'delete',
        `/registered-games/${createdRegisteredGameId}`,
      )
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('20. 이미 삭제된 직관 삭제 시도', () => {
      return requestWithDefault(
        app,
        'delete',
        `/registered-games/${createdRegisteredGameId}`,
      )
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('21. 패배한 경기에 대한 직관 등록 성공', async () => {
      const loseGameId = '20250823LTNC0'; // 테스터 유저가 away_team = 1 인 경우

      const res = await requestWithDefault(app, 'post', '/registered-games')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          seat: '115블록 2열 13번',
          review: '패배했다',
          gameId: loseGameId,
          cheeringTeamId: targetTestedUser.teamId,
        });

      expect(HttpStatus.CREATED);
      expect(res.body).toHaveProperty('status', RegisteredGameStatus.Lose);
      expect(res.body.game).toHaveProperty('id', loseGameId);
    });

    it('22. 취소된 경기에 대한 직관 등록 성공', async () => {
      const cancelGameId = '20250917LTSS0'; // 테스터 유저가 away_team = 1 인 경우
      const res = await requestWithDefault(app, 'post', '/registered-games')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          seat: '115블록 2열 13번',
          review: '취소했다',
          gameId: cancelGameId,
          cheeringTeamId: targetTestedUser.teamId,
        });
      expect(HttpStatus.CREATED);
      expect(res.body).toHaveProperty('status', RegisteredGameStatus.NoGame);
      expect(res.body.game).toHaveProperty('id', cancelGameId);
    });

    it('23. 무승부한 경기에 대한 직관 등록 성공', async () => {
      const tieGameId = '20250830OBLT0'; // 테스터 유저가 home_team = 1 인 경우
      const res = await requestWithDefault(app, 'post', '/registered-games')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .send({
          seat: '115블록 2열 13번',
          review: '무승부했다',
          gameId: tieGameId,
          cheeringTeamId: targetTestedUser.teamId,
        });
      expect(HttpStatus.CREATED);
      expect(res.body).toHaveProperty('status', RegisteredGameStatus.Tie);
      expect(res.body.game).toHaveProperty('id', tieGameId);
    });

    it('24. 직관 종합 기록 맞는 지 확인', async () => {
      const res = await requestWithDefault(app, 'get', '/users/me')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.OK);

      expect(res.body.user).toHaveProperty('id', targetTestedUser.id);
      expect(res.body.user).toHaveProperty('email', targetTestedUser.email);
      expect(res.body.record).toHaveProperty('win', 0);
      expect(res.body.record).toHaveProperty('lose', 1);
      expect(res.body.record).toHaveProperty('tie', 1);
      expect(res.body.record).toHaveProperty('cancel', 1);
      expect(res.body.record).toHaveProperty('total', 3);
      expect(res.body.record).toHaveProperty('score', 990);
    });

    it('25. 회원 탈퇴', () => {
      return requestWithDefault(app, 'delete', '/users/me')
        .set('Authorization', `Bearer ${accessTokenList[0]}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
