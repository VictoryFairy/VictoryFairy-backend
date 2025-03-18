import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

// Transactional 라이브러리 관련 모킹
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => ({}),
  runOnTransactionCommit: jest.fn((callback: () => Promise<void>) =>
    callback(),
  ),
}));
import { AuthService } from 'src/auth/auth.service';
import { EmailWithCodeDto } from 'src/dtos/user.dto';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import { User } from 'src/entities/user.entity';
import { MailService } from 'src/services/mail.service';
import { AuthRedisService } from 'src/services/auth-redis.service';
import { IOAuthStateCachingData } from 'src/types/auth.type';
import * as randomCodeUtil from 'src/utils/random-code.util';
import { MockServiceFactory } from './mocks/unit-mock-factory';
import { SocialProvider } from 'src/const/auth.const';
import { Repository } from 'typeorm';

jest.mock('uuid', () => ({
  v7: jest.fn().mockReturnValue('test-uuid-v7'),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashed-password')),
  compare: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

const mockUser = {
  id: 1,
  email: 'test@test.com',
  nickname: 'tester',
  support_team: { id: 1, name: 'team' },
};

const mockConfigData = {
  JWT_REFRESH_SECRET: 'refreshsecret',
  JWT_ACCESS_SECRET: 'accesssecret',
  REFRESH_EXPIRE_TIME: '6000',
  ACCESS_EXPIRE_TIME: '3600',
};

describe('AuthService Test', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let authRedisService: AuthRedisService;
  let mailService: MailService;
  let userRepository: Repository<User>;
  let localAuthRepository: Repository<LocalAuth>;
  let socialAuthRepository: Repository<SocialAuth>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              switch (key) {
                case 'JWT_REFRESH_SECRET':
                  return mockConfigData.JWT_REFRESH_SECRET;
                case 'JWT_ACCESS_SECRET':
                  return mockConfigData.JWT_ACCESS_SECRET;
                case 'REFRESH_EXPIRE_TIME':
                  return mockConfigData.REFRESH_EXPIRE_TIME;
                case 'ACCESS_EXPIRE_TIME':
                  return mockConfigData.ACCESS_EXPIRE_TIME;
              }
            }),
          },
        },
        {
          provide: JwtService,
          useValue: MockServiceFactory.createMockService(JwtService),
        },
        {
          provide: AuthRedisService,
          useValue: MockServiceFactory.createMockService(AuthRedisService),
        },
        {
          provide: MailService,
          useValue: MockServiceFactory.createMockService(MailService),
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LocalAuth),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            insert: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SocialAuth),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            insert: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    authRedisService = moduleRef.get(AuthRedisService);
    mailService = moduleRef.get(MailService);
    userRepository = moduleRef.get(getRepositoryToken(User));
    localAuthRepository = moduleRef.get(getRepositoryToken(LocalAuth));
    socialAuthRepository = moduleRef.get(getRepositoryToken(SocialAuth));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('getUserForAuth', () => {
    it('유저 ID로 유저 정보를 가져옴', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await authService.getUserForAuth(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { support_team: true },
        select: {
          id: true,
          email: true,
          nickname: true,
          support_team: { id: true, name: true },
        },
      });
    });

    it('유저가 없는 경우 null 반환', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await authService.getUserForAuth(999);

      expect(result).toBeNull();
    });
  });

  describe('makeCodeAndSendMail', () => {
    it('인증 코드를 생성하고 이메일 전송 후 캐싱', async () => {
      const email = 'test@test.com';
      jest.spyOn(randomCodeUtil, 'createRandomCode').mockReturnValue('12345');
      jest.spyOn(mailService, 'sendAuthCodeMail').mockResolvedValue(true);
      jest
        .spyOn(authRedisService, 'cachingVerificationCode')
        .mockResolvedValue(undefined);

      const result = await authService.makeCodeAndSendMail(email);

      expect(result).toBe(true);
      expect(mailService.sendAuthCodeMail).toHaveBeenCalledWith(email, '12345');
      expect(authRedisService.cachingVerificationCode).toHaveBeenCalledWith(
        email,
        '12345',
      );
    });

    it('인증 코드를 해당 이메일 전송 실패한 경우, InternalServerErrorException 예외 발생', async () => {
      const email = 'test@test.com';
      jest.spyOn(randomCodeUtil, 'createRandomCode').mockReturnValue('12345');
      jest.spyOn(mailService, 'sendAuthCodeMail').mockResolvedValue(false);

      await expect(authService.makeCodeAndSendMail(email)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mailService.sendAuthCodeMail).toHaveBeenCalledWith(email, '12345');
      expect(authRedisService.cachingVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmailCode', () => {
    it('사용자가 입력한 이메일 코드가 올바르면 true 반환', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '12345',
        email: 'test@test.com',
      };

      jest
        .spyOn(authRedisService, 'getCachedVerificationCode')
        .mockResolvedValue('12345');
      jest
        .spyOn(authRedisService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      const result = await authService.verifyEmailCode(mockDto);

      expect(result).toEqual(true);
      expect(authRedisService.getCachedVerificationCode).toHaveBeenCalledWith(
        mockDto.email,
      );
      expect(authRedisService.deleteVerificationCode).toHaveBeenCalledWith(
        mockDto.email,
      );
    });

    it('해당 이메일로 캐싱된 코드가 없는 경우, UnauthorizedException예외를 반환', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '54321',
        email: 'mock@test.com',
      };
      jest
        .spyOn(authRedisService, 'getCachedVerificationCode')
        .mockResolvedValue(null);
      jest
        .spyOn(authRedisService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      await expect(authService.verifyEmailCode(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authRedisService.getCachedVerificationCode).toHaveBeenCalledWith(
        mockDto.email,
      );
      expect(authRedisService.deleteVerificationCode).not.toHaveBeenCalled();
    });

    it('사용자가 입력한 코드가 캐싱되어 있는 코드와 다른 경우, UnauthorizedException예외를 발생', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '54321',
        email: 'mock@test.com',
      };
      jest
        .spyOn(authRedisService, 'getCachedVerificationCode')
        .mockResolvedValue('12345');
      jest
        .spyOn(authRedisService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      await expect(authService.verifyEmailCode(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authRedisService.getCachedVerificationCode).toHaveBeenCalledWith(
        mockDto.email,
      );
      expect(authRedisService.deleteVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('issueToken', () => {
    it('리프레시 토큰을 발급', async () => {
      const payload = { id: 1, email: 'test@test.com' };
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      const result = authService.issueToken(payload, 'refresh');

      expect(result).toBe('token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { ...payload, type: 'rf' },
        {
          secret: mockConfigData.JWT_REFRESH_SECRET,
          expiresIn: parseInt(mockConfigData.REFRESH_EXPIRE_TIME),
        },
      );
    });

    it('액세스 토큰을 발급', async () => {
      const payload = { id: 1, email: 'test@test.com' };
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      const result = authService.issueToken(payload, 'access');

      expect(result).toBe('token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { ...payload, type: 'ac' },
        {
          secret: mockConfigData.JWT_ACCESS_SECRET,
          expiresIn: parseInt(mockConfigData.ACCESS_EXPIRE_TIME),
        },
      );
    });
  });

  describe('changePassword', () => {
    it('비밀번호를 변경하고 true를 반환', async () => {
      const userId = 1;
      const newPassword = 'newPassword123';

      jest.spyOn(localAuthRepository, 'update').mockResolvedValue(undefined);

      const result = await authService.changePassword(userId, newPassword);

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, expect.any(Number));
      expect(localAuthRepository.update).toHaveBeenCalledWith(
        { user_id: userId },
        { password: 'hashed-password' },
      );
    });

    it('업데이트 실패 시 InternalServerErrorException 예외 발생', async () => {
      const userId = 1;
      const newPassword = 'newPassword123';

      jest
        .spyOn(localAuthRepository, 'update')
        .mockRejectedValue(new Error('DB Error'));

      await expect(
        authService.changePassword(userId, newPassword),
      ).rejects.toThrow(InternalServerErrorException);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, expect.any(Number));
    });
  });

  describe('verifyLocalAuth', () => {
    it('비밀번호 검증 성공 시 true 반환', async () => {
      const userId = 1;
      const password = 'password123';
      const localAuth = { password: 'hashed-password' };

      jest
        .spyOn(localAuthRepository, 'findOne')
        .mockResolvedValue(localAuth as LocalAuth);

      const result = await authService.verifyLocalAuth(userId, password);

      expect(result).toBe(true);
      expect(localAuthRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, localAuth.password);
    });

    it('비밀번호 검증 실패 시 false 반환', async () => {
      const userId = 1;
      const password = 'wrongPassword';
      const localAuth = { password: 'hashed-password' };

      jest
        .spyOn(localAuthRepository, 'findOne')
        .mockResolvedValue(localAuth as LocalAuth);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const result = await authService.verifyLocalAuth(userId, password);

      expect(result).toBe(false);
    });
  });

  describe('createLocalAuth', () => {
    it('LocalAuth 생성 성공 시 true 반환', async () => {
      const userId = 1;
      const password = 'password123';

      jest.spyOn(localAuthRepository, 'insert').mockResolvedValue(undefined);

      const result = await authService.createLocalAuth(userId, password);

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, expect.any(Number));
      expect(localAuthRepository.insert).toHaveBeenCalledWith({
        user_id: userId,
        password: 'hashed-password',
      });
    });

    it('LocalAuth 생성 실패 시 InternalServerErrorException 예외 발생', async () => {
      const userId = 1;
      const password = 'password123';

      jest
        .spyOn(localAuthRepository, 'insert')
        .mockRejectedValue(new Error('DB Error'));

      await expect(
        authService.createLocalAuth(userId, password),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getUserWithSocialAuthList', () => {
    it('유저의 소셜 인증 목록을 반환', async () => {
      const userId = 1;
      const socialAuths = [
        { provider: SocialProvider.GOOGLE, sub: 'google123' },
        { provider: SocialProvider.KAKAO, sub: 'kakao123' },
      ];

      jest
        .spyOn(socialAuthRepository, 'find')
        .mockResolvedValue(socialAuths as SocialAuth[]);

      const result = await authService.getUserWithSocialAuthList(userId);

      expect(result).toEqual(socialAuths);
      expect(socialAuthRepository.find).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });
  });

  describe('getSocialAuth', () => {
    it('조건에 맞는 소셜 인증 정보를 반환', async () => {
      const where = { sub: 'google123', provider: SocialProvider.GOOGLE };
      const relations = { user: true };
      const select = { id: true, sub: true };
      const socialAuth = {
        id: 1,
        sub: 'google123',
        provider: SocialProvider.GOOGLE,
        user: mockUser,
      };

      jest
        .spyOn(socialAuthRepository, 'findOne')
        .mockResolvedValue(socialAuth as SocialAuth);

      const result = await authService.getSocialAuth(where, relations, select);

      expect(result).toEqual(socialAuth);
      expect(socialAuthRepository.findOne).toHaveBeenCalledWith({
        where,
        relations,
        select,
      });
    });

    it('조건에 맞는 소셜 인증이 없을 경우 null 반환', async () => {
      const where = { sub: 'nonexistent', provider: SocialProvider.GOOGLE };

      jest.spyOn(socialAuthRepository, 'findOne').mockResolvedValue(null);

      const result = await authService.getSocialAuth(where);

      expect(result).toBeNull();
    });
  });

  describe('saveOAuthStateWithUser', () => {
    it('OAuth 상태를 저장하고 state를 반환', async () => {
      const data = {
        provider: SocialProvider.GOOGLE,
        userId: 1,
      };

      jest
        .spyOn(authRedisService, 'saveOAuthState')
        .mockResolvedValue(undefined);

      const result = await authService.saveOAuthStateWithUser(data);

      expect(result).toEqual({ state: 'test-uuid-v7' });
      expect(authRedisService.saveOAuthState).toHaveBeenCalledWith({
        ...data,
        state: 'test-uuid-v7',
      });
    });
  });

  describe('createSocialAuth', () => {
    it('소셜 인증 생성 성공 시 true 반환', async () => {
      const socialAuthData = {
        sub: 'google123',
        provider: SocialProvider.GOOGLE,
        providerEmail: 'test@gmail.com',
      };
      const userId = 1;

      jest.spyOn(socialAuthRepository, 'insert').mockResolvedValue(undefined);

      const result = await authService.createSocialAuth(socialAuthData, userId);

      expect(result).toBe(true);
      expect(socialAuthRepository.insert).toHaveBeenCalledWith({
        sub: socialAuthData.sub,
        provider: socialAuthData.provider,
        provider_email: socialAuthData.providerEmail,
        user_id: userId,
      });
    });

    it('소셜 인증 생성 실패 시 InternalServerErrorException 예외 발생', async () => {
      const socialAuthData = {
        sub: 'google123',
        provider: SocialProvider.GOOGLE,
        providerEmail: 'test@gmail.com',
      };
      const userId = 1;

      jest
        .spyOn(socialAuthRepository, 'insert')
        .mockRejectedValue(new Error('DB Error'));

      await expect(
        authService.createSocialAuth(socialAuthData, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getOAuthStateData', () => {
    it('OAuth 상태 데이터를 반환', async () => {
      const state = 'test-state';
      const oauthData: IOAuthStateCachingData = {
        provider: SocialProvider.GOOGLE,
        state,
        userId: 1,
      };

      jest
        .spyOn(authRedisService, 'getOAuthState')
        .mockResolvedValue(oauthData);

      const result = await authService.getOAuthStateData(state);

      expect(result).toEqual(oauthData);
      expect(authRedisService.getOAuthState).toHaveBeenCalledWith(state);
    });
  });
});
