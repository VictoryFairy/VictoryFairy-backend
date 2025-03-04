import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';
import { RankService } from 'src/services/rank.service';
import { AwsS3Service } from 'src/services/aws-s3.service';
import { UserRedisService } from 'src/services/user-redis.service';
import { UserService } from 'src/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import { EventName } from 'src/const/event.const';
import { Logger } from '@nestjs/common';
import { CreateLocalUserDto } from 'src/dtos/user.dto';
import { DEFAULT_PROFILE_IMAGE } from 'src/const/user.const';
import { AccountService } from 'src/account/account.service';
import { TermService } from 'src/services/term.service';

const mockUsers = [
  { id: 1, email: 'test1@test.com', nickname: 'tester1' },
  { id: 2, email: 'test2@test.com', nickname: 'tester2' },
  { id: 3, email: 'test3@test.com', nickname: 'tester3' },
];

const mockCreateUserDto: CreateLocalUserDto = {
  email: 'test12@test.com',
  image: 'img',
  password: '123123',
  teamId: 1,
  nickname: 'tester',
};

const mockCreatedUser: Partial<User> = {
  email: mockCreateUserDto.email,
  profile_image: mockCreateUserDto.image,
  id: 100,
  nickname: 'tester',
  support_team: { id: mockCreateUserDto.teamId } as Team,
};

// Transactional 라이브러리 관련 모킹
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => ({}),
  runOnTransactionCommit: jest.fn((callback: () => Promise<void>) =>
    callback(),
  ),
}));

describe('userService Test', () => {
  let userRepo: Repository<User>;
  let teamRepo: Repository<Team>;
  let userService: UserService;
  let rankService: RankService;
  let awsS3Service: AwsS3Service;
  let userRedisService: UserRedisService;
  let eventEmitter: EventEmitter2;
  let accountService: AccountService;
  let termService: TermService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: EventEmitter2,
          useValue: MockServiceFactory.createMockService(EventEmitter2),
        },
        {
          provide: getRepositoryToken(User),
          useValue: MockRepoFactory.createMockRepo<User>(),
        },
        {
          provide: getRepositoryToken(Team),
          useValue: MockRepoFactory.createMockRepo<Team>(),
        },
        {
          provide: RankService,
          useValue: MockServiceFactory.createMockService(RankService),
        },
        {
          provide: AwsS3Service,
          useValue: MockServiceFactory.createMockService(AwsS3Service),
        },
        {
          provide: UserRedisService,
          useValue: MockServiceFactory.createMockService(UserRedisService),
        },
        {
          provide: TermService,
          useValue: MockServiceFactory.createMockService(TermService),
        },
        {
          provide: AccountService,
          useValue: MockServiceFactory.createMockService(AccountService),
        },
      ],
    }).compile();
    userService = moduleRef.get(UserService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    teamRepo = moduleRef.get(getRepositoryToken(Team));
    rankService = moduleRef.get(RankService);
    awsS3Service = moduleRef.get(AwsS3Service);
    userRedisService = moduleRef.get(UserRedisService);
    eventEmitter = moduleRef.get(EventEmitter2);
    accountService = moduleRef.get(AccountService);
    termService = moduleRef.get(TermService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('isExistEmail', () => {
    it('accountService.isExistEmail을 호출하고 결과를 반환', async () => {
      const email = 'test@example.com';
      jest.spyOn(accountService, 'isExistEmail').mockResolvedValue(true);

      const result = await userService.isExistEmail(email);

      expect(result).toBe(true);
      expect(accountService.isExistEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('isExistNickname', () => {
    it('accountService.isExistNickname을 호출하고 결과를 반환', async () => {
      const nickname = 'testuser';
      jest.spyOn(accountService, 'isExistNickname').mockResolvedValue(false);

      const result = await userService.isExistNickname(nickname);

      expect(result).toBe(false);
      expect(accountService.isExistNickname).toHaveBeenCalledWith(nickname);
    });
  });

  describe('initCacheUser', () => {
    it('유저 캐싱이 완료된 후 이벤트 이미터로 이벤트가 발생', async () => {
      jest.spyOn(userRepo, 'find').mockResolvedValue(mockUsers as User[]);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest.spyOn(eventEmitter, 'emit').mockReturnValue(true);

      await userService.initCacheUsers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EventName.CACHED_USERS,
        mockUsers.map((a) => a.id),
      );
      expect(userRepo.find).toHaveBeenCalled();
      mockUsers.forEach((user, i) => {
        expect(userRedisService.saveUser).toHaveBeenNthCalledWith(i + 1, user);
      });
    });

    it('유저가 없다면 해당 메소드는 이벤트 발생 없이 종료', async () => {
      jest.spyOn(userRepo, 'find').mockResolvedValue([]);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest.spyOn(eventEmitter, 'emit').mockReturnValue(true);

      await userService.initCacheUsers();
      expect(userRepo.find).toHaveBeenCalled();
      expect(userRedisService.saveUser).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('레디스 캐싱이 실패하면 에러가 발생', async () => {
      Logger.overrideLogger(false); // 로그 출력 안 하도록 설정
      jest.spyOn(userRepo, 'find').mockResolvedValue(mockUsers as User[]);
      jest
        .spyOn(userRedisService, 'saveUser')
        .mockRejectedValue(new Error('Redis 캐싱 실패'));
      jest.spyOn(eventEmitter, 'emit').mockReturnValue(true);

      await expect(userService.initCacheUsers()).rejects.toThrow();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('createLocalUser', () => {
    it('accountService.createLocalUser를 호출하고 결과를 처리', async () => {
      jest
        .spyOn(accountService, 'createLocalUser')
        .mockResolvedValue(mockCreatedUser as User);
      jest.spyOn(rankService, 'initialSave').mockResolvedValue(undefined);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockResolvedValue(undefined);

      const result = await userService.createLocalUser(mockCreateUserDto);

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(accountService.createLocalUser).toHaveBeenCalledWith(
        mockCreateUserDto,
      );
      expect(rankService.initialSave).toHaveBeenCalled();
      expect(userRedisService.saveUser).toHaveBeenCalledWith(mockCreatedUser);
      expect(rankService.updateRedisRankings).toHaveBeenCalledWith(
        mockCreatedUser.id,
      );
    });

    it('Redis 캐싱이 실패 시 로그만 출력 후, 유저 생성은 성공', async () => {
      jest
        .spyOn(accountService, 'createLocalUser')
        .mockResolvedValue(mockCreatedUser as User);
      jest.spyOn(rankService, 'initialSave').mockResolvedValue(undefined);
      jest
        .spyOn(userRedisService, 'saveUser')
        .mockRejectedValue(new Error('Redis 캐싱 실패'));
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockResolvedValue(undefined);
      jest.spyOn(userService['logger'], 'warn').mockImplementation(() => {});

      const result = await userService.createLocalUser(mockCreateUserDto);

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(accountService.createLocalUser).toHaveBeenCalledWith(
        mockCreateUserDto,
      );
      expect(userRedisService.saveUser).toHaveBeenCalled();
      expect(rankService.updateRedisRankings).not.toHaveBeenCalled();
      expect(userService['logger'].warn).toHaveBeenCalledWith(
        `유저 ${mockCreatedUser.id} 캐싱 실패`,
        expect.any(String),
      );
    });
  });

  describe('checkUserPw', () => {
    it('accountService.verifyLocalAuth를 호출하고 결과를 반환', async () => {
      const user = { id: 1 } as User;
      const password = 'password123';

      jest.spyOn(accountService, 'verifyLocalAuth').mockResolvedValue(true);

      const result = await userService.checkUserPw(user, password);

      expect(result).toBe(true);
      expect(accountService.verifyLocalAuth).toHaveBeenCalledWith(
        user.id,
        password,
      );
    });
  });

  describe('changeUserPw', () => {
    it('accountService.changePassword를 호출', async () => {
      const dto = { email: 'test@example.com', password: 'newpassword' };

      jest.spyOn(accountService, 'changePassword').mockResolvedValue(undefined);

      await userService.changeUserPw(dto);

      expect(accountService.changePassword).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
    });
  });

  describe('changeUserProfile', () => {
    let mockUser: User;

    beforeEach(() => {
      mockUser = {
        email: mockCreateUserDto.email,
        profile_image: mockCreateUserDto.image,
        id: 100,
        nickname: 'tester',
        support_team: { id: 1 } as Team,
      } as User;
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest.spyOn(awsS3Service, 'deleteImage').mockResolvedValue(undefined);
    });

    it('팀을 변경하면, 팀 변경 후 저장된 유저 정보를 리턴', async () => {
      const updatedUser: User = {
        ...mockUser,
        support_team: { id: 2 } as Team,
      } as User;
      jest.spyOn(accountService, 'updateUser').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'teamId', value: 2 },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(accountService.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          support_team: { id: 2 },
        }),
      );
      expect(userRedisService.saveUser).not.toHaveBeenCalled();
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('이미지를 변경 시, DB에 프로필 이미지 변경 후, S3 이미지 삭제 및 레디스에 캐싱', async () => {
      const updatedUser: User = {
        ...mockUser,
        profile_image: 'updated_img',
      } as User;
      jest.spyOn(accountService, 'updateUser').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        {
          field: 'image',
          value: 'updated_img',
        },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(accountService.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_image: 'updated_img',
        }),
      );
      expect(userRedisService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).toHaveBeenCalledWith({
        fileUrl: 'img',
      });
    });

    it('이미지를 변경 시, 기존 프로필 이미지가 DEFAULT 이미지인 경우, 이미지 삭제 스킵 및 레디스 캐싱 수행', async () => {
      const mockDefaultImgUser = {
        id: 1,
        profile_image: DEFAULT_PROFILE_IMAGE,
      } as User;
      const updatedUser = {
        ...mockDefaultImgUser,
        profile_image: 'img',
      } as User;
      jest.spyOn(accountService, 'updateUser').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'image', value: 'img' },
        mockDefaultImgUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRedisService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('이미지를 변경 시, 기존 프로필과 같다면, 이미지 삭제 스킵 및 레디스 캐싱 수행', async () => {
      const updatedUser: User = { ...mockUser, profile_image: 'img' } as User;
      jest.spyOn(accountService, 'updateUser').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'image', value: 'img' },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRedisService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('nickname을 변경하면, DB에 닉네임 변경 후, 레디스에 캐싱', async () => {
      const updatedUser: User = {
        ...mockUser,
        nickname: 'updated_nick',
      } as User;
      jest.spyOn(accountService, 'updateUser').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        {
          field: 'nickname',
          value: 'updated_nick',
        },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(accountService.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: 'updated_nick',
        }),
      );
      expect(userRedisService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('유저 정보 업데이트 실패 시, InternalServerErrorException 예외 발생', async () => {
      jest
        .spyOn(accountService, 'updateUser')
        .mockRejectedValue(new Error('업데이트 실패'));

      await expect(
        userService.changeUserProfile({ field: 'teamId', value: 2 }, mockUser),
      ).rejects.toThrow(Error);
      expect(userRedisService.saveUser).not.toHaveBeenCalled();
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('유저 삭제 및 관련 리소스 정리', async () => {
      const mockUser = {
        id: 1,
        profile_image: 'image-url',
      } as User;
      const mockTeams = [{ id: 1 }, { id: 2 }];

      jest.spyOn(teamRepo, 'find').mockResolvedValue(mockTeams as Team[]);
      jest.spyOn(accountService, 'deleteUser').mockResolvedValue(undefined);
      jest.spyOn(awsS3Service, 'deleteImage').mockResolvedValue(undefined);
      jest
        .spyOn(userRedisService, 'userSynchronizationTransaction')
        .mockResolvedValue(undefined);

      await userService.deleteUser(mockUser);

      expect(teamRepo.find).toHaveBeenCalledWith({ select: { id: true } });
      expect(accountService.deleteUser).toHaveBeenCalledWith(mockUser.id);
      expect(awsS3Service.deleteImage).toHaveBeenCalledWith({
        fileUrl: mockUser.profile_image,
      });
      expect(
        userRedisService.userSynchronizationTransaction,
      ).toHaveBeenCalledWith(mockUser.id, mockTeams);
    });

    it('기본 프로필 이미지인 경우 이미지 삭제 스킵', async () => {
      const mockUser = {
        id: 1,
        profile_image: DEFAULT_PROFILE_IMAGE,
      } as User;
      const mockTeams = [{ id: 1 }];

      jest.spyOn(teamRepo, 'find').mockResolvedValue(mockTeams as Team[]);
      jest.spyOn(accountService, 'deleteUser').mockResolvedValue(undefined);
      jest.spyOn(awsS3Service, 'deleteImage').mockResolvedValue(undefined);
      jest
        .spyOn(userRedisService, 'userSynchronizationTransaction')
        .mockResolvedValue(undefined);

      await userService.deleteUser(mockUser);

      expect(accountService.deleteUser).toHaveBeenCalledWith(mockUser.id);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
      expect(
        userRedisService.userSynchronizationTransaction,
      ).toHaveBeenCalledWith(mockUser.id, mockTeams);
    });
  });

  describe('agreeTerm', () => {
    it('termService.saveUserAgreedTerm을 호출', async () => {
      const user = { id: 1 } as User;
      const termIds = ['term1', 'term2'];

      jest
        .spyOn(termService, 'saveUserAgreedTerm')
        .mockResolvedValue(undefined);

      await userService.agreeTerm(user, termIds);

      expect(termService.saveUserAgreedTerm).toHaveBeenCalledWith(
        user.id,
        termIds,
      );
    });
  });
});
