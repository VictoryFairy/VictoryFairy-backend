import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from 'src/modules/team/entities/team.entity';
import { AwsS3Service } from 'src/core/aws-s3/aws-s3.service';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import { EventName } from 'src/shared/const/event.const';
import { Logger } from '@nestjs/common';
import { CreateUserDto } from 'src/modules/account/account.dto';
import { DEFAULT_PROFILE_IMAGE } from 'src/modules/user/const/user.const';
import { User } from 'src/modules/user/entities/user.entity';
import { TermService } from 'src/modules/term/term.service';
import { UserService } from 'src/modules/user/user.service';

const mockUsers = [
  { id: 1, email: 'test1@test.com', nickname: 'tester1' },
  { id: 2, email: 'test2@test.com', nickname: 'tester2' },
  { id: 3, email: 'test3@test.com', nickname: 'tester3' },
];

const mockCreateUserDto: CreateUserDto = {
  email: 'test12@test.com',
  image: 'img',
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
  let awsS3Service: AwsS3Service;
  let userRedisService: UserRedisService;
  let eventEmitter: EventEmitter2;
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
      ],
    }).compile();
    userService = moduleRef.get(UserService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    teamRepo = moduleRef.get(getRepositoryToken(Team));
    awsS3Service = moduleRef.get(AwsS3Service);
    userRedisService = moduleRef.get(UserRedisService);
    eventEmitter = moduleRef.get(EventEmitter2);
    termService = moduleRef.get(TermService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('isExistEmail', () => {
    it('이메일 존재 여부를 확인하고 결과를 반환', async () => {
      const email = 'test@example.com';
      jest.spyOn(userRepo, 'exists').mockResolvedValue(true);

      const result = await userService.isExistEmail(email);

      expect(result).toBe(true);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { email } });
    });

    it('DB 조회 실패 시 예외 발생', async () => {
      const email = 'test@example.com';
      jest
        .spyOn(userRepo, 'exists')
        .mockRejectedValue(new Error('DB 조회 실패'));

      await expect(userService.isExistEmail(email)).rejects.toThrow(
        'DB 조회 실패',
      );
    });
  });

  describe('isExistNickname', () => {
    it('닉네임 존재 여부를 확인하고 결과를 반환', async () => {
      const nickname = 'testuser';
      jest.spyOn(userRepo, 'exists').mockResolvedValue(false);

      const result = await userService.isExistNickname(nickname);

      expect(result).toBe(false);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { nickname } });
    });

    it('DB 조회 실패 시 예외 발생', async () => {
      const nickname = 'testuser';
      jest
        .spyOn(userRepo, 'exists')
        .mockRejectedValue(new Error('DB 조회 실패'));

      await expect(userService.isExistNickname(nickname)).rejects.toThrow(
        'DB 조회 실패',
      );
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

  describe('saveUser', () => {
    it('유저 생성 및 저장 성공', async () => {
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockCreatedUser as User);
      jest
        .spyOn(userService, 'generateRandomNickname')
        .mockResolvedValue('랜덤닉네임#1234');

      const result = await userService.saveUser(mockCreateUserDto);

      expect(result).toEqual(mockCreatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockCreateUserDto.email,
          nickname: mockCreateUserDto.nickname,
          profile_image: mockCreateUserDto.image,
          support_team: { id: mockCreateUserDto.teamId },
        }),
      );
    });

    it('닉네임이 비어있는 경우 랜덤 닉네임 생성', async () => {
      const dtoWithoutNickname = { ...mockCreateUserDto, nickname: '' };
      const randomNickname = '승리요정#1234';
      jest
        .spyOn(userService, 'generateRandomNickname')
        .mockResolvedValue(randomNickname);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        ...mockCreatedUser,
        nickname: randomNickname,
      } as User);

      const result = await userService.saveUser(dtoWithoutNickname);

      expect(result.nickname).toBe(randomNickname);
      expect(userService.generateRandomNickname).toHaveBeenCalled();
    });

    it('이미지가 없는 경우 기본 이미지 사용', async () => {
      const dtoWithoutImage = { ...mockCreateUserDto, image: undefined };

      jest.spyOn(userRepo, 'save').mockImplementation((userData: any) => {
        expect(userData.profile_image).toBeUndefined();

        return Promise.resolve({
          ...mockCreatedUser,
          profile_image: DEFAULT_PROFILE_IMAGE,
        } as User);
      });

      const result = await userService.saveUser(dtoWithoutImage);

      expect(result.profile_image).toBe(DEFAULT_PROFILE_IMAGE);
    });

    it('DB 저장 실패 시 예외 발생', async () => {
      jest.spyOn(userRepo, 'save').mockRejectedValue(new Error('DB 에러'));

      await expect(userService.saveUser(mockCreateUserDto)).rejects.toThrow(
        'DB 저장 실패',
      );
    });
  });

  describe('getUser', () => {
    it('조건에 맞는 유저 정보를 반환', async () => {
      const mockUser = { id: 1, email: 'test@example.com' } as User;
      const where = { id: 1 };
      const relations = { support_team: true };
      const select = { id: true, email: true };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);

      const result = await userService.getUser(where, relations, select);

      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where,
        relations,
        select,
      });
    });

    it('유저가 없는 경우 null 반환', async () => {
      const where = { id: 999 };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      const result = await userService.getUser(where);

      expect(result).toBeNull();
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
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'teamId', value: 2 },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(
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
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        {
          field: 'image',
          value: 'updated_img',
        },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(
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
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

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
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

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
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        {
          field: 'nickname',
          value: 'updated_nick',
        },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: 'updated_nick',
        }),
      );
      expect(userRedisService.saveUser).toHaveBeenCalledWith(updatedUser);
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
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepo, 'delete').mockResolvedValue(null);
      jest.spyOn(awsS3Service, 'deleteImage').mockResolvedValue(undefined);
      jest
        .spyOn(userRedisService, 'userSynchronizationTransaction')
        .mockResolvedValue(undefined);

      await userService.deleteUser(mockUser.id);

      expect(teamRepo.find).toHaveBeenCalledWith({ select: { id: true } });
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(userRepo.delete).toHaveBeenCalledWith(mockUser.id);
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
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepo, 'delete').mockResolvedValue(null);
      jest.spyOn(awsS3Service, 'deleteImage').mockResolvedValue(undefined);
      jest
        .spyOn(userRedisService, 'userSynchronizationTransaction')
        .mockResolvedValue(undefined);

      await userService.deleteUser(mockUser.id);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(userRepo.delete).toHaveBeenCalledWith(mockUser.id);
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
      const mockTermList = {
        required: [{ id: 'term1' }, { id: 'term2' }],
        optional: [{ id: 'term3' }, { id: 'term4' }],
      };

      jest.spyOn(termService, 'getTermList').mockResolvedValue(mockTermList);
      jest
        .spyOn(termService, 'saveUserAgreedTerm')
        .mockResolvedValue(undefined);

      await userService.agreeTerm(user.id, termIds);

      expect(termService.getTermList).toHaveBeenCalled();
      expect(termService.saveUserAgreedTerm).toHaveBeenCalledWith(
        user.id,
        termIds,
      );
    });
  });

  describe('generateRandomNickname', () => {
    it('중복되지 않는 랜덤 닉네임 생성', async () => {
      // 처음에는 중복된 닉네임이라고 가정
      jest
        .spyOn(userService, 'isExistNickname')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await userService.generateRandomNickname();

      expect(result).toMatch(/승리요정#\d{4}/);
      expect(userService.isExistNickname).toHaveBeenCalledTimes(2);
    });
  });
});
