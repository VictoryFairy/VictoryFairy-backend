import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from 'src/entities/team.entity';
import { User } from 'src/entities/user.entity';
import { RankService } from 'src/services/rank.service';
import { AwsS3Service } from 'src/services/aws-s3.service';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { UserService } from 'src/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import { EventName } from 'src/const/event.const';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateLocalUserDto } from 'src/dtos/user.dto';
import { DEFAULT_PROFILE_IMAGE } from 'src/const/user.const';
import { LocalAuth } from 'src/entities/local-auth.entity';

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
const mockHashedPw = 'hashed_pw';
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
  let localAuthRepo: Repository<LocalAuth>;
  let userService: UserService;
  let rankService: RankService;
  let awsS3Service: AwsS3Service;
  let redisCachingService: RedisCachingService;
  let eventEmitter: EventEmitter2;

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
          provide: RedisCachingService,
          useValue: MockServiceFactory.createMockService(RedisCachingService),
        },
        {
          provide: getRepositoryToken(LocalAuth),
          useValue: MockRepoFactory.createMockRepo<LocalAuth>(),
        },
      ],
    }).compile();
    userService = moduleRef.get(UserService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    localAuthRepo = moduleRef.get(getRepositoryToken(LocalAuth));
    rankService = moduleRef.get(RankService);
    awsS3Service = moduleRef.get(AwsS3Service);
    redisCachingService = moduleRef.get(RedisCachingService);
    eventEmitter = moduleRef.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('initCacheUser', () => {
    it('유저 캐싱이 완료된 후 이벤트 이미터로 이벤트가 발생', async () => {
      jest.spyOn(userRepo, 'find').mockResolvedValue(mockUsers as User[]);
      jest.spyOn(redisCachingService, 'saveUser');
      jest.spyOn(eventEmitter, 'emit');

      await userService.initCacheUsers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EventName.CACHED_USERS,
        mockUsers.map((a) => a.id),
      );
      expect(userRepo.find).toHaveBeenCalled();
      mockUsers.forEach((user, i) => {
        expect(redisCachingService.saveUser).toHaveBeenNthCalledWith(
          i + 1,
          user,
        );
      });
    });

    it('유저가 없다면 해당 메소드는 이벤트 발생 없이 종료', async () => {
      jest.spyOn(userRepo, 'find').mockResolvedValue([]);
      jest.spyOn(redisCachingService, 'saveUser');
      jest.spyOn(eventEmitter, 'emit');

      await userService.initCacheUsers();
      expect(userRepo.find).toHaveBeenCalled();
      expect(redisCachingService.saveUser).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('레디스 캐싱이 실패하면 InternalServerErrorException 예외 발생', async () => {
      Logger.overrideLogger(false); // 로그 출력 안 하도록 설정
      jest.spyOn(userRepo, 'find').mockResolvedValue(mockUsers as User[]);
      jest
        .spyOn(redisCachingService, 'saveUser')
        .mockRejectedValue(new Error());
      jest.spyOn(eventEmitter, 'emit');

      expect(userService.initCacheUsers()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    beforeEach(async () => {
      const bcryptHash = jest.fn().mockResolvedValue(mockHashedPw);
      (bcrypt.hash as jest.Mock) = bcryptHash;
      jest.spyOn(localAuthRepo, 'insert');
    });

    it('이미지와 닉네임이 빈 값이 아니고 유저가 생성 되었다면, 생성된 유저 아이디를 반환', async () => {
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockCreatedUser as User);
      jest.spyOn(userService, 'isExistNickname');
      jest.spyOn(rankService, 'initialSave');
      jest.spyOn(redisCachingService, 'saveUser');
      jest.spyOn(rankService, 'updateRedisRankings');

      const result = await userService.createLocalUser(mockCreateUserDto);

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(userService.isExistNickname).not.toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockCreateUserDto.email,
          profile_image: mockCreateUserDto.image,
          support_team: { id: mockCreateUserDto.teamId },
        }),
      );
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(localAuthRepo.insert).toHaveBeenCalledWith({
        user_id: mockCreatedUser.id,
        password: mockHashedPw,
      });

      expect(rankService.initialSave).toHaveBeenCalled();
      expect(rankService.updateRedisRankings).toHaveBeenCalledWith(
        mockCreatedUser.id,
      );
    });

    it('프로필 이미지가 빈 값인 경우, 기본 프로필 이미지로 유저를 생성', async () => {
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockCreatedUser as User);
      jest.spyOn(userService, 'isExistNickname');

      const result = await userService.createLocalUser({
        ...mockCreateUserDto,
        image: '',
      });

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(userService.isExistNickname).not.toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_image: DEFAULT_PROFILE_IMAGE,
          nickname: mockCreateUserDto.nickname,
        }),
      );
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(localAuthRepo.insert).toHaveBeenCalledWith({
        user_id: mockCreatedUser.id,
        password: mockHashedPw,
      });
    });

    it('닉네임이 빈 값인 경우, 중복 확인 후 자동생성 닉네임으로 유저를 생성', async () => {
      const randomDefaultNick = '승리요정#1234';
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.3123); // 같은 숫자로 아이디 있다고 가정
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.1234);
      jest.spyOn(userService, 'isExistNickname').mockResolvedValueOnce(true); // 같은 숫자로 아이디 있다고 가정
      jest.spyOn(userService, 'isExistNickname').mockResolvedValueOnce(false);
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockCreatedUser as User);

      const result = await userService.createLocalUser({
        ...mockCreateUserDto,
        nickname: '',
      });

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(userService.isExistNickname).toHaveBeenCalledTimes(2);
      expect(userService.isExistNickname).toHaveBeenLastCalledWith(
        randomDefaultNick,
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_image: mockCreateUserDto.image,
          nickname: randomDefaultNick,
        }),
      );
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(userRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: expect.any(String),
        }),
      );
      expect(localAuthRepo.insert).toHaveBeenCalledWith({
        user_id: mockCreatedUser.id,
        password: mockHashedPw,
      });
    });

    it('유저 DB에 저장 실패 시, InternalServerErrorException예외 발생', async () => {
      jest.spyOn(userRepo, 'save').mockRejectedValue(new Error());
      jest.spyOn(redisCachingService, 'saveUser');

      await expect(
        userService.createLocalUser(mockCreateUserDto),
      ).rejects.toThrow(InternalServerErrorException);
      expect(redisCachingService.saveUser).not.toHaveBeenCalled();
    });

    it('Redis 캐싱이 실패 시 로그만 출력 후, 유저 생성은 성공', async () => {
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockCreatedUser as User);
      jest
        .spyOn(redisCachingService, 'saveUser')
        .mockRejectedValue(new Error());
      jest.spyOn(rankService, 'updateRedisRankings');
      jest.spyOn(userService['logger'], 'warn');

      const result = await userService.createLocalUser(mockCreateUserDto);

      expect(result).toEqual({ id: mockCreatedUser.id });
      expect(redisCachingService.saveUser).toHaveBeenCalled();
      expect(rankService.updateRedisRankings).not.toHaveBeenCalled();
      expect(userService['logger'].warn).toHaveBeenCalledWith(
        `유저 ${mockCreatedUser.id} 캐싱 실패`,
        expect.any(String),
      );
    });
  });

  describe('changeUserProfile', () => {
    let mockUser: User;

    beforeEach(() => {
      mockUser = {
        email: mockCreateUserDto.email,
        profile_image: mockCreateUserDto.image,
        local_auth: { password: mockHashedPw },
        id: 100,
        nickname: 'tester',
        support_team: { id: 1 } as Team,
      } as User;
      jest.spyOn(redisCachingService, 'saveUser');
      jest.spyOn(awsS3Service, 'deleteImage');
    });

    it('팀을 변경하면, 팀 변경 후 저장된 유저 정보를 리턴', async () => {
      const updatedUser: User = {
        ...mockUser,
        support_team: { id: 2 } as Team,
      };
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'teamId', value: 2 },
        mockUser as User,
      );

      expect(result).toEqual(updatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(updatedUser);
      expect(redisCachingService.saveUser).not.toHaveBeenCalled();
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });
    it('이미지를 변경 시, DB에 프로필 이미지 변경 후, S3 이미지 삭제 및 레디스에 캐싱', async () => {
      const updatedUser: User = { ...mockUser, profile_image: 'updated_img' };
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        {
          field: 'image',
          value: 'updated_img',
        },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(userRepo.save).toHaveBeenCalledWith(updatedUser);
      expect(redisCachingService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).toHaveBeenCalledWith({
        fileUrl: 'img',
      });
    });

    it('이미지를 변경 시, 기존 프로필 이미지가 DEFAULT 이미지인 경우, 이미지 삭제 스킵 및 레디스 캐싱 수행', async () => {
      const mockDefaultImgUser = {
        id: 1,
        profile_image: DEFAULT_PROFILE_IMAGE,
      } as User;
      const updatedUser = { ...mockDefaultImgUser, profile_image: 'img' };
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'image', value: 'img' },
        mockDefaultImgUser,
      );

      expect(result).toEqual(updatedUser);
      expect(redisCachingService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('이미지를 변경 시, 기존 프로필과 같다면, 이미지 삭제 스킵 및 레디스 캐싱 수행', async () => {
      const updatedUser: User = { ...mockUser, profile_image: 'img' };
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userService.changeUserProfile(
        { field: 'image', value: 'img' },
        mockUser,
      );

      expect(result).toEqual(updatedUser);
      expect(redisCachingService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it('nickname을 변경하면, DB에 닉네임 변경 후, 레디스에 캐싱', async () => {
      const updatedUser: User = { ...mockUser, nickname: 'updated_nick' };
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser);

      const result = await userService.changeUserProfile(
        {
          field: 'nickname',
          value: 'updated_nick',
        },
        mockUser,
      );

      expect(result).toEqual({ ...mockUser, nickname: 'updated_nick' });
      expect(redisCachingService.saveUser).toHaveBeenCalledWith(updatedUser);
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });
    it('유저 정보 실패 시, InternalServerErrorException예외 발생', async () => {
      jest.spyOn(userRepo, 'save').mockRejectedValue(new Error());

      await expect(
        userService.changeUserProfile({ field: 'teamId', value: 2 }, mockUser),
      ).rejects.toThrow(InternalServerErrorException);
      expect(redisCachingService.saveUser).not.toHaveBeenCalled();
      expect(awsS3Service.deleteImage).not.toHaveBeenCalled();
    });
  });
});
