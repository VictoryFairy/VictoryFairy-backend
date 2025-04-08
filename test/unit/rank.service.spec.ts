import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegisteredGame } from 'src/modules/registered-game/entities/registered-game.entity';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import { Repository } from 'typeorm';
import { Rank } from 'src/modules/rank/entities/rank.entity';
import { RankingRedisService } from 'src/core/redis/ranking-redis.service';
import { RankService } from 'src/modules/rank/rank.service';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateRankDto } from 'src/modules/rank/dto/rank.dto';
import { TRegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';
import { IRefinedRankData } from 'src/modules/rank/types/rank.type';
import { User } from 'src/modules/user/entities/user.entity';

describe('RankService', () => {
  let registeredGameRepo: Repository<RegisteredGame>;
  let rankRepo: Repository<Rank>;
  let rankingRedisService: RankingRedisService;
  let userRedisService: UserRedisService;
  let rankService: RankService;
  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RankService,
        {
          provide: getRepositoryToken(RegisteredGame),
          useValue: MockRepoFactory.createMockRepo<RegisteredGame>(),
        },
        {
          provide: getRepositoryToken(Rank),
          useValue: MockRepoFactory.createMockRepo<Rank>(),
        },
        {
          provide: RankingRedisService,
          useValue: MockServiceFactory.createMockService(RankingRedisService),
        },
        {
          provide: UserRedisService,
          useValue: MockServiceFactory.createMockService(UserRedisService),
        },
      ],
    }).compile();

    registeredGameRepo = moduleRef.get(getRepositoryToken(RegisteredGame));
    rankRepo = moduleRef.get(getRepositoryToken(Rank));
    rankingRedisService = moduleRef.get(RankingRedisService);
    userRedisService = moduleRef.get(UserRedisService);
    rankService = moduleRef.get(RankService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initRankCaching', () => {
    it('페이로드에 3개의 유저 아이디가 들어오면, 3명의 유저 랭킹 정보를 업데이트', async () => {
      const mockPayload = [1, 2, 3];

      const spyUpdateRedis = jest.spyOn(rankService, 'updateRedisRankings');

      await rankService.initRankCaching(mockPayload);

      expect(rankService.updateRedisRankings).toHaveBeenCalledTimes(
        mockPayload.length,
      );
      mockPayload.forEach((userId, i) =>
        expect(spyUpdateRedis).toHaveBeenNthCalledWith(i + 1, userId),
      );
    });
    it('페이로드에 유저 아이디가 없다면, 해당 함수는 조기 종료하고 로그 출력', async () => {
      const mockPayload = [];

      jest.spyOn(rankService, 'updateRedisRankings');
      jest.spyOn(rankService['logger'], 'log');

      await rankService.initRankCaching(mockPayload);

      expect(rankService.updateRedisRankings).not.toHaveBeenCalled();
      expect(rankService['logger'].log).toHaveBeenCalledWith(
        '빈 페이로드로 랭킹 레디스 초기 캐싱 스킵',
      );
    });
    it('유저 랭킹 정보 업데이트가 하나라도 실패하면, InternalServerErrorException 예외 발생', async () => {
      Logger.overrideLogger(false); // 테스트 상황에서 불필요한 로깅 안하도록 설정
      const mockPayload = [1, 2, 3];
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockImplementation((userId) => {
          if (userId === mockPayload[mockPayload.length - 1]) {
            return Promise.reject(new Error());
          }
          return Promise.resolve();
        });

      await expect(rankService.initRankCaching(mockPayload)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('initialSave', () => {
    it('올바른 데이터가 들어오면 rankService.insert가 적절히 호출', async () => {
      const mockWatchedGame: Omit<CreateRankDto, 'status'> = {
        team_id: 1,
        user_id: 1,
        year: 2024,
      };
      const { user_id, year, team_id } = mockWatchedGame;

      await rankService.insertRankIfAbsent(mockWatchedGame);

      expect(rankRepo.insert).toHaveBeenCalledWith({
        team_id,
        active_year: year,
        user: { id: user_id },
      });
    });
  });

  describe('updateRankEntity', () => {
    let mockWatchedGame: CreateRankDto;
    let mockRankFindOneData: Rank;
    beforeEach(() => {
      mockWatchedGame = {
        team_id: 1,
        user_id: 1,
        year: 2024,
        status: 'Win',
      };
      mockRankFindOneData = {
        active_year: mockWatchedGame.year,
        team_id: mockWatchedGame.team_id,
        user: { id: mockWatchedGame.user_id } as User,
        win: 0,
        lose: 0,
        cancel: 0,
        tie: 0,
      } as Rank;
    });

    it.each([
      ['추가', true],
      ['삭제', false],
    ])(
      '기존 테이블이 있고 직관 등록을 %s인 경우, 정상적으로 작동',
      async (_, isAdd) => {
        const spyInsert = jest.spyOn(rankRepo, 'insert');
        jest.spyOn(rankRepo, 'increment');
        jest.spyOn(rankRepo, 'decrement');
        jest.spyOn(rankRepo, 'findOne').mockResolvedValue(mockRankFindOneData);

        const { team_id, user_id, year, status } = mockWatchedGame;

        await rankService.updateRankEntity(mockWatchedGame, isAdd);

        expect(spyInsert).not.toHaveBeenCalled();
        if (isAdd) {
          expect(rankRepo.increment).toHaveBeenCalledWith(
            { team_id, user: { id: user_id }, active_year: year },
            status.toLowerCase(),
            1,
          );
          expect(rankRepo.decrement).not.toHaveBeenCalled();
        } else {
          expect(rankRepo.increment).not.toHaveBeenCalled();
          expect(rankRepo.decrement).toHaveBeenCalledWith(
            { team_id, user: { id: user_id }, active_year: year },
            status.toLowerCase(),
            1,
          );
        }
      },
    );
    it.each([
      ['추가', '생성', true],
      ['삭제', '아무것도 작동 안함', false],
    ])(
      '기존 테이블이 없는 경우, %s 경우, 랭크 테이블에 %s ',
      async (_, __, isAdd) => {
        const { user_id, team_id, year } = mockWatchedGame;
        const spyInsert = jest.spyOn(rankRepo, 'insert');
        jest.spyOn(rankRepo, 'increment');
        jest.spyOn(rankRepo, 'decrement');
        jest.spyOn(rankRepo, 'findOne').mockResolvedValue(null);

        await rankService.updateRankEntity(mockWatchedGame, isAdd);
        if (isAdd) {
          expect(spyInsert).toHaveBeenCalledWith({
            team_id,
            user: { id: user_id },
            active_year: year,
            win: 1,
          });
          expect(rankRepo.increment).not.toHaveBeenCalled();
        } else {
          expect(spyInsert).not.toHaveBeenCalled();
          expect(rankRepo.decrement).not.toHaveBeenCalled();
        }
      },
    );
    it.each(['Lose', 'Tie', 'No game'])(
      '기존 데이터가 있고, status가 %s인 경우, 데이터가 적절히 업데이트',
      async (statusCase) => {
        mockWatchedGame.status = statusCase as TRegisteredGameStatus;

        const { team_id, user_id, year, status } = mockWatchedGame;
        jest.spyOn(rankRepo, 'findOne').mockResolvedValue(mockRankFindOneData);
        const spyIncrement = jest.spyOn(rankRepo, 'increment');

        await rankService.updateRankEntity(mockWatchedGame, true);

        expect(spyIncrement).toHaveBeenCalledWith(
          { team_id, user: { id: user_id }, active_year: year },
          status === 'No game' ? 'cancel' : status.toLowerCase(),
          1,
        );
      },
    );
  });

  describe('getUserRankWithNeighbors', () => {
    it('정상적으로 처리되면, 해당 유저와 근처 유저 랭킹 리스트 반환', async () => {
      jest.spyOn(rankingRedisService, 'getUserRank').mockResolvedValueOnce(5); // 6등인 경우
      jest.spyOn(rankingRedisService, 'getUserRank').mockResolvedValueOnce(4);
      jest.spyOn(rankingRedisService, 'getUserRank').mockResolvedValueOnce(5); // 해당 유저의 랭킹
      jest.spyOn(rankingRedisService, 'getUserRank').mockResolvedValueOnce(6);
      jest
        .spyOn(rankService, 'getRankList')
        .mockResolvedValueOnce([
          { user_id: 2 } as IRefinedRankData,
          { user_id: 3 } as IRefinedRankData,
          { user_id: 4 } as IRefinedRankData,
        ]);

      const result = await rankService.getUserRankWithNeighbors(3);

      expect(rankService.getRankList).toHaveBeenCalledWith(4, 6, undefined);
      expect(rankingRedisService.getUserRank).toHaveBeenCalledTimes(4);
      expect(result).toEqual([
        { user_id: 2, rank: 5 },
        { user_id: 3, rank: 6 },
        { user_id: 4, rank: 7 },
      ]);
    });
    it('유저 랭킹 리스트가 없다면, 빈 배열 반환', async () => {
      jest
        .spyOn(rankingRedisService, 'getUserRank')
        .mockResolvedValueOnce(null);

      const result = await rankService.getUserRankWithNeighbors(1);
      expect(result).toEqual([]);
      expect(rankingRedisService.getUserRank).toHaveBeenCalledWith(
        1,
        undefined,
      );
    });
  });

  describe('getRankList', () => {
    let mockRefinedData: IRefinedRankData[];
    beforeEach(() => {
      mockRefinedData = [
        {
          nickname: 'tester1',
          profile_image: 'img',
          rank: 2,
          score: 990,
          user_id: 1,
        },
        {
          nickname: 'tester2',
          profile_image: 'img2',
          rank: 1,
          score: 1000,
          user_id: 2,
        },
        {
          nickname: 'tester3',
          profile_image: 'img3',
          rank: 3,
          score: 980,
          user_id: 3,
        },
      ];
    });
    it('팀 ID가 제공되었을 때, 해당 팀의 랭킹 리스트를 반환', async () => {
      const teamId = 1;

      const spyRedis = jest.spyOn(rankingRedisService, 'getRankingList');
      jest
        .spyOn(rankService as any, 'refineRankData')
        .mockResolvedValue(mockRefinedData);

      const result = await rankService.getRankList(0, 2, teamId);

      expect(result).toEqual(mockRefinedData);
      expect(spyRedis).toHaveBeenCalledWith(teamId, 0, 2);
    });

    it('팀 ID가 제공되지 않았을 때, 종합 랭킹 리스트를 반환', async () => {
      const spyRedis = jest.spyOn(rankingRedisService, 'getRankingList');

      jest
        .spyOn(rankService as any, 'refineRankData')
        .mockResolvedValue(mockRefinedData);

      const result = await rankService.getRankList(0, 2);

      expect(result).toEqual(mockRefinedData);
      expect(spyRedis).toHaveBeenCalledWith('total', 0, 2);
    });

    it('end가 -1이 아니면서 start가 end보다 더 큰 경우, 에러를 발생', async () => {
      const [start, end] = [5, 3];

      await expect(rankService.getRankList(start, end)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateRedisRankings', () => {
    it('', async () => {
      jest
        .spyOn(rankService as any, 'calculateUserRankings')
        .mockResolvedValue({
          '5': { win: 0, lose: 0, score: 1000 },
          total: { win: 0, lose: 0, score: 1000 },
        });
      const spyRedis = jest.spyOn(
        rankingRedisService,
        'updateRankingScoreByUserId',
      );
      await rankService.updateRedisRankings(1);

      expect(spyRedis).toHaveBeenCalledTimes(2);
      expect(spyRedis).toHaveBeenNthCalledWith(1, 1, '1000', '5');
      expect(spyRedis).toHaveBeenNthCalledWith(2, 1, '1000', 'total');
    });
  });

  describe('userOverallGameStats', () => {
    it('해당 유저의 모든 팀과 종합 기록을 반환', async () => {
      jest
        .spyOn(rankRepo, 'find')
        .mockResolvedValue([
          { team_id: 1, win: 0, lose: 2, tie: 0, cancel: 0 } as Rank,
          { team_id: 2, win: 1, lose: 0, tie: 1, cancel: 0 } as Rank,
        ]);
      const result = await rankService.userOverallGameStats(1);
      expect(result).toEqual({
        win: 1,
        lose: 2,
        tie: 1,
        cancel: 0,
        total: 4,
        score: 990,
      });
    });
    it('해당 유저의 기록이 없는 경우, 기본값 반환', async () => {
      jest.spyOn(rankRepo, 'find').mockResolvedValue([]);
      const result = await rankService.userOverallGameStats(1);
      expect(result).toEqual({
        win: 0,
        lose: 0,
        tie: 0,
        cancel: 0,
        total: 0,
        score: 1000,
      });
    });
    it('Rank 테이블 조회 실패 시, InternalServerErrorException예외 반환', async () => {
      jest.spyOn(rankRepo, 'find').mockRejectedValue(new Error());

      await expect(rankService.userOverallGameStats(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
