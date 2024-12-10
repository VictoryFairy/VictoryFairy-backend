import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegisteredGame } from 'src/entities/registered-game.entity';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import { Repository } from 'typeorm';
import { Rank } from 'src/entities/rank.entity';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { RankService } from 'src/services/rank.service';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateRankDto } from 'src/dtos/rank.dto';

describe('RankService', () => {
  let registeredGameRepo: Repository<RegisteredGame>;
  let rankRepo: Repository<Rank>;
  let redisCachingService: RedisCachingService;
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
          provide: RedisCachingService,
          useValue: MockServiceFactory.createMockService(RedisCachingService),
        },
      ],
    }).compile();

    registeredGameRepo = moduleRef.get(getRepositoryToken(RegisteredGame));
    rankRepo = moduleRef.get(getRepositoryToken(Rank));
    redisCachingService = moduleRef.get(RedisCachingService);
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

      await rankService.initialSave(mockWatchedGame);

      expect(rankRepo.insert).toHaveBeenCalledWith({
        team_id,
        active_year: year,
        user: { id: user_id },
      });
    });
  });
});
