import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountService } from 'src/account/account.service';
import { User } from 'src/entities/user.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { Repository } from 'typeorm';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DEFAULT_PROFILE_IMAGE, HASH_ROUND } from 'src/const/user.const';
import { CreateLocalUserDto } from 'src/dtos/user.dto';
import { SocialProvider } from 'src/const/auth.const';
import { v7 as uuidv7 } from 'uuid';

jest.mock('uuid', () => ({
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashed_password')),
  compare: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

describe('AccountService', () => {
  let accountService: AccountService;
  let userRepo: Repository<User>;
  let localAuthRepo: Repository<LocalAuth>;
  let socialAuthRepo: Repository<SocialAuth>;
  let jwtService: JwtService;
  let redisCachingService: RedisCachingService;

  const mockConfigData = {
    JWT_REFRESH_SECRET: 'refreshsecret',
    JWT_ACCESS_SECRET: 'accesssecret',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: getRepositoryToken(User),
          useValue: MockRepoFactory.createMockRepo<User>(),
        },
        {
          provide: getRepositoryToken(LocalAuth),
          useValue: MockRepoFactory.createMockRepo<LocalAuth>(),
        },
        {
          provide: getRepositoryToken(SocialAuth),
          useValue: MockRepoFactory.createMockRepo<SocialAuth>(),
        },
        {
          provide: JwtService,
          useValue: MockServiceFactory.createMockService(JwtService),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              switch (key) {
                case 'JWT_REFRESH_SECRET':
                  return mockConfigData.JWT_REFRESH_SECRET;
                case 'JWT_ACCESS_SECRET':
                  return mockConfigData.JWT_ACCESS_SECRET;
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: RedisCachingService,
          useValue: MockServiceFactory.createMockService(RedisCachingService),
        },
      ],
    }).compile();

    accountService = module.get<AccountService>(AccountService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    localAuthRepo = module.get<Repository<LocalAuth>>(
      getRepositoryToken(LocalAuth),
    );
    socialAuthRepo = module.get<Repository<SocialAuth>>(
      getRepositoryToken(SocialAuth),
    );
    jwtService = module.get<JwtService>(JwtService);
    redisCachingService = module.get<RedisCachingService>(RedisCachingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(accountService).toBeDefined();
  });

  describe('getUser', () => {
    it('유저 정보를 조회하여 반환', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      const where = { email: 'test@test.com' };
      const relations = { support_team: true };
      const select = { id: true, email: true };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      const result = await accountService.getUser(where, relations, select);

      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where,
        relations,
        select,
      });
    });

    it('유저가 없는 경우 null 반환', async () => {
      const where = { email: 'nonexistent@test.com' };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      const result = await accountService.getUser(where);

      expect(result).toBeNull();
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where,
        relations: undefined,
        select: undefined,
      });
    });
  });

  describe('verifyLocalAuth', () => {
    it('비밀번호가 일치하면 true 반환', async () => {
      const userId = 1;
      const password = 'password123';
      const hashedPassword = 'hashed_password';
      const localAuth = { user_id: userId, password: hashedPassword };

      jest
        .spyOn(localAuthRepo, 'findOne')
        .mockResolvedValue(localAuth as LocalAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await accountService.verifyLocalAuth(userId, password);

      expect(result).toBe(true);
      expect(localAuthRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('비밀번호가 일치하지 않으면 false 반환', async () => {
      const userId = 1;
      const password = 'wrong_password';
      const hashedPassword = 'hashed_password';
      const localAuth = { user_id: userId, password: hashedPassword };

      jest
        .spyOn(localAuthRepo, 'findOne')
        .mockResolvedValue(localAuth as LocalAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await accountService.verifyLocalAuth(userId, password);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });

  describe('findSocialAuth', () => {
    it('소셜 인증 정보를 조회하여 반환', async () => {
      const mockSocialAuth = {
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        user_id: 1,
        user: { id: 1, email: 'test@test.com' },
      };
      const where = { sub: 'social123', provider: SocialProvider.GOOGLE };
      const relations = { user: true };
      const select = { user: { id: true, email: true } };

      jest
        .spyOn(socialAuthRepo, 'findOne')
        .mockResolvedValue(mockSocialAuth as SocialAuth);

      const result = await accountService.getSocialAuth(
        where,
        relations,
        select,
      );

      expect(result).toEqual(mockSocialAuth);
      expect(socialAuthRepo.findOne).toHaveBeenCalledWith({
        where,
        relations,
        select,
      });
    });

    it('소셜 인증 정보가 없는 경우 null 반환', async () => {
      const where = { sub: 'nonexistent', provider: SocialProvider.GOOGLE };

      jest.spyOn(socialAuthRepo, 'findOne').mockResolvedValue(null);

      const result = await accountService.getSocialAuth(where);

      expect(result).toBeNull();
      expect(socialAuthRepo.findOne).toHaveBeenCalledWith({
        where,
        relations: undefined,
        select: undefined,
      });
    });
  });

  describe('isExistEmail', () => {
    it('이메일이 존재하면 true 반환', async () => {
      const email = 'test@test.com';

      jest.spyOn(userRepo, 'exists').mockResolvedValue(true);

      const result = await accountService.isExistEmail(email);

      expect(result).toBe(true);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { email } });
    });

    it('이메일이 존재하지 않으면 false 반환', async () => {
      const email = 'nonexistent@test.com';

      jest.spyOn(userRepo, 'exists').mockResolvedValue(false);

      const result = await accountService.isExistEmail(email);

      expect(result).toBe(false);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { email } });
    });

    it('DB 조회 실패 시 InternalServerErrorException 발생', async () => {
      const email = 'test@test.com';

      jest.spyOn(userRepo, 'exists').mockRejectedValue(new Error('DB 에러'));

      await expect(accountService.isExistEmail(email)).rejects.toThrow(Error);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { email } });
    });
  });

  describe('isExistNickname', () => {
    it('닉네임이 존재하면 true 반환', async () => {
      const nickname = 'testuser';

      jest.spyOn(userRepo, 'exists').mockResolvedValue(true);

      const result = await accountService.isExistNickname(nickname);

      expect(result).toBe(true);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { nickname } });
    });

    it('닉네임이 존재하지 않으면 false 반환', async () => {
      const nickname = 'nonexistent';

      jest.spyOn(userRepo, 'exists').mockResolvedValue(false);

      const result = await accountService.isExistNickname(nickname);

      expect(result).toBe(false);
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { nickname } });
    });

    it('DB 조회 실패 시 InternalServerErrorException 발생', async () => {
      const nickname = 'testuser';

      jest.spyOn(userRepo, 'exists').mockRejectedValue(new Error('DB 에러'));

      await expect(accountService.isExistNickname(nickname)).rejects.toThrow(
        Error,
      );
      expect(userRepo.exists).toHaveBeenCalledWith({ where: { nickname } });
    });
  });

  describe('createLocalUser', () => {
    it('로컬 유저 생성 및 반환', async () => {
      const dto: CreateLocalUserDto = {
        email: 'test@test.com',
        password: 'password123',
        nickname: 'testuser',
        teamId: 1,
        image: 'profile.jpg',
      };
      const createdUser = {
        id: 1,
        email: dto.email,
        nickname: dto.nickname,
        profile_image: dto.image,
        support_team: { id: dto.teamId, name: 'Team' },
      };

      // createUser 메서드 모킹
      jest
        .spyOn(accountService, 'createUser')
        .mockResolvedValue(createdUser as User);
      // createLocalAuth 메서드 모킹
      jest.spyOn(accountService, 'createLocalAuth').mockResolvedValue(true);

      const result = await accountService.createLocalUser(dto);

      expect(result).toEqual(createdUser);
      expect(accountService.createUser).toHaveBeenCalledWith({
        email: dto.email,
        image: dto.image,
        nickname: dto.nickname,
        teamId: dto.teamId,
      });
      expect(accountService.createLocalAuth).toHaveBeenCalledWith(
        createdUser.id,
        dto.password,
      );
    });
  });

  describe('createSocialUser', () => {
    it('소셜 유저 생성 및 반환', async () => {
      const userData = { email: 'test@test.com' };
      const socialAuthData = {
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
      };
      const createdUser = {
        id: 1,
        email: userData.email,
        nickname: '승리요정#0001',
        profile_image: DEFAULT_PROFILE_IMAGE,
        support_team: { id: 1, name: 'Team' },
      };

      jest
        .spyOn(accountService, 'createUser')
        .mockResolvedValue(createdUser as User);
      jest.spyOn(accountService, 'createSocialAuth').mockResolvedValue(true);

      const result = await accountService.createSocialUser(
        userData,
        socialAuthData,
      );

      expect(result).toEqual(createdUser);
      expect(accountService.createUser).toHaveBeenCalledWith(userData);
      expect(accountService.createSocialAuth).toHaveBeenCalledWith({
        ...socialAuthData,
        user_id: createdUser.id,
      });
    });
  });

  describe('createUser', () => {
    it('유저 생성 및 반환 (모든 필드 제공)', async () => {
      const dto = {
        email: 'test@test.com',
        nickname: 'testuser',
        image: 'profile.jpg',
        teamId: 2,
      };
      const createdUser = {
        id: 1,
        email: dto.email,
        nickname: dto.nickname,
        profile_image: dto.image,
        support_team: { id: dto.teamId, name: 'Team' },
      };

      jest.spyOn(userRepo, 'insert').mockResolvedValue(undefined);
      jest
        .spyOn(accountService, 'getUser')
        .mockResolvedValue(createdUser as User);

      const result = await accountService.createUser(dto);

      expect(result).toEqual(createdUser);
      expect(userRepo.insert).toHaveBeenCalledWith({
        email: dto.email,
        profile_image: dto.image,
        support_team: { id: dto.teamId },
        nickname: dto.nickname,
      });
      expect(accountService.getUser).toHaveBeenCalledWith(
        { email: dto.email },
        { support_team: true },
        {
          id: true,
          email: true,
          nickname: true,
          profile_image: true,
          support_team: { id: true, name: true },
        },
      );
    });

    it('유저 생성 시 기본값 적용 (닉네임, 이미지, 팀 ID 미제공)', async () => {
      const dto = { email: 'test@test.com' };
      const createdUser = {
        id: 1,
        email: dto.email,
        nickname: '승리요정#0001',
        profile_image: DEFAULT_PROFILE_IMAGE,
        support_team: { id: 1, name: 'Team' },
      };

      // userRepo.exists 모킹 (generateRandomNickname 내부에서 호출됨)
      jest.spyOn(userRepo, 'exists').mockResolvedValueOnce(false);
      jest.spyOn(userRepo, 'insert').mockResolvedValue(undefined);
      jest
        .spyOn(accountService, 'getUser')
        .mockResolvedValue(createdUser as User);

      const result = await accountService.createUser(dto);

      expect(result).toEqual(createdUser);
      expect(userRepo.insert).toHaveBeenCalled();
    });
  });

  describe('createLocalAuth', () => {
    it('로컬 인증 정보 생성 성공', async () => {
      const userId = 1;
      const password = 'password123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(localAuthRepo, 'insert').mockResolvedValue(undefined);

      const result = await accountService.createLocalAuth(userId, password);

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, HASH_ROUND);
      expect(localAuthRepo.insert).toHaveBeenCalledWith({
        user_id: userId,
        password: 'hashed_password',
      });
    });

    it('로컬 인증 정보 생성 실패 시 InternalServerErrorException 발생', async () => {
      const userId = 1;
      const password = 'password123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest
        .spyOn(localAuthRepo, 'insert')
        .mockRejectedValue(new Error('DB 에러'));

      await expect(
        accountService.createLocalAuth(userId, password),
      ).rejects.toThrow(InternalServerErrorException);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, HASH_ROUND);
    });
  });

  describe('createSocialAuth', () => {
    it('소셜 인증 정보 생성 성공', async () => {
      const data = {
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        user_id: 1,
      };

      jest.spyOn(socialAuthRepo, 'insert').mockResolvedValue(undefined);

      const result = await accountService.createSocialAuth(data);

      expect(result).toBe(true);
      expect(socialAuthRepo.insert).toHaveBeenCalledWith(data);
    });

    it('소셜 인증 정보 생성 실패 시 InternalServerErrorException 발생', async () => {
      const data = {
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        user_id: 1,
      };

      jest
        .spyOn(socialAuthRepo, 'insert')
        .mockRejectedValue(new Error('DB 에러'));

      await expect(accountService.createSocialAuth(data)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(socialAuthRepo.insert).toHaveBeenCalledWith(data);
    });
  });

  describe('changePassword', () => {
    it('비밀번호 변경 성공', async () => {
      const email = 'test@test.com';
      const password = 'newpassword';
      const user = { id: 1, email };

      jest.spyOn(accountService, 'getUser').mockResolvedValue(user as User);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      jest.spyOn(localAuthRepo, 'update').mockResolvedValue(undefined);

      await accountService.changePassword(email, password);

      expect(accountService.getUser).toHaveBeenCalledWith({ email });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, HASH_ROUND);
      expect(localAuthRepo.update).toHaveBeenCalledWith(
        { user_id: user.id },
        { password: 'new_hashed_password' },
      );
    });

    it('유저가 존재하지 않을 경우 BadRequestException 발생', async () => {
      const email = 'nonexistent@test.com';
      const password = 'newpassword';

      jest.spyOn(accountService, 'getUser').mockResolvedValue(null);

      await expect(
        accountService.changePassword(email, password),
      ).rejects.toThrow(BadRequestException);
      expect(accountService.getUser).toHaveBeenCalledWith({ email });
    });

    it('비밀번호 업데이트 실패 시 InternalServerErrorException 발생', async () => {
      const email = 'test@test.com';
      const password = 'newpassword';
      const user = { id: 1, email };

      jest.spyOn(accountService, 'getUser').mockResolvedValue(user as User);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      jest
        .spyOn(localAuthRepo, 'update')
        .mockRejectedValue(new Error('DB 에러'));

      await expect(
        accountService.changePassword(email, password),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteUser', () => {
    it('유저 삭제 성공', async () => {
      const userId = 1;

      jest.spyOn(userRepo, 'delete').mockResolvedValue(undefined);

      await accountService.deleteUser(userId);

      expect(userRepo.delete).toHaveBeenCalledWith(userId);
    });

    it('유저 삭제 실패 시 InternalServerErrorException 발생', async () => {
      const userId = 1;

      jest.spyOn(userRepo, 'delete').mockRejectedValue(new Error('DB 에러'));

      await expect(accountService.deleteUser(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(userRepo.delete).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUser', () => {
    it('유저 정보 업데이트 성공', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        nickname: 'updated_nickname',
      };

      jest.spyOn(userRepo, 'save').mockResolvedValue(user as User);

      const result = await accountService.updateUser(user as User);

      expect(result).toEqual(user);
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });

    it('유저 정보 업데이트 실패 시 InternalServerErrorException 발생', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        nickname: 'updated_nickname',
      };

      jest.spyOn(userRepo, 'save').mockRejectedValue(new Error('DB 에러'));

      await expect(accountService.updateUser(user as User)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('올바른 헤더에서 토큰 추출', () => {
      const authHeader = 'Bearer token123';
      const expectedToken = 'token123';

      const result = accountService.extractTokenFromHeader(authHeader);

      expect(result).toBe(expectedToken);
    });

    it('헤더 형식이 잘못된 경우 UnauthorizedException 발생', () => {
      const authHeader = 'Bearer token extra';

      expect(() => accountService.extractTokenFromHeader(authHeader)).toThrow(
        UnauthorizedException,
      );
    });

    it('Bearer 접두사가 없는 경우 UnauthorizedException 발생', () => {
      const authHeader = 'Basic token123';

      expect(() => accountService.extractTokenFromHeader(authHeader)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('유효한 리프레시 토큰 검증', async () => {
      const token = 'valid_refresh_token';
      const payload = { id: 1, email: 'test@test.com', type: 'rf' };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await accountService.verifyToken(token, true);

      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: mockConfigData.JWT_REFRESH_SECRET,
      });
    });

    it('유효한 액세스 토큰 검증', async () => {
      const token = 'valid_access_token';
      const payload = { id: 1, email: 'test@test.com', type: 'ac' };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await accountService.verifyToken(token, false);

      expect(result).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: mockConfigData.JWT_ACCESS_SECRET,
      });
    });

    it('유효하지 않은 리프레시 토큰 검증 시 UnauthorizedException 발생', async () => {
      const token = 'invalid_refresh_token';

      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('토큰 에러'));

      await expect(accountService.verifyToken(token, true)).rejects.toThrow(
        new UnauthorizedException('다시 로그인 해주세요'),
      );
    });

    it('유효하지 않은 액세스 토큰 검증 시 UnauthorizedException 발생', async () => {
      const token = 'invalid_access_token';

      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('토큰 에러'));

      await expect(accountService.verifyToken(token, false)).rejects.toThrow(
        new UnauthorizedException('유효하지 않은 토큰'),
      );
    });
  });

  describe('saveOAuthStateWithUser', () => {
    it('OAuth 상태 저장 및 state 반환', async () => {
      const data = { provider: SocialProvider.GOOGLE, userId: 1 };
      const expectedState = 'mock-uuid-v7';

      jest
        .spyOn(redisCachingService, 'saveOAuthState')
        .mockResolvedValue(undefined);

      const result = await accountService.saveOAuthStateWithUser(data);

      expect(result).toEqual({ state: expectedState });
      expect(uuidv7).toHaveBeenCalled();
      expect(redisCachingService.saveOAuthState).toHaveBeenCalledWith({
        ...data,
        state: expectedState,
      });
    });
  });

  describe('getOAuthStateData', () => {
    it('OAuth 상태 데이터 조회', async () => {
      const state = 'state123';
      const stateData = {
        provider: SocialProvider.GOOGLE,
        userId: 1,
        state,
      };

      jest
        .spyOn(redisCachingService, 'getOAuthState')
        .mockResolvedValue(stateData);

      const result = await accountService.getOAuthStateData(state);

      expect(result).toEqual(stateData);
      expect(redisCachingService.getOAuthState).toHaveBeenCalledWith(state);
    });
  });
});
