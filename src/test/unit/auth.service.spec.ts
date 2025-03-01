import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

// Transactional 라이브러리 관련 모킹
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => ({}),
  runOnTransactionCommit: jest.fn((callback: () => Promise<void>) =>
    callback(),
  ),
}));
import { AuthService } from 'src/auth/auth.service';
import { EmailWithCodeDto, LoginLocalUserDto } from 'src/dtos/user.dto';
import { User } from 'src/entities/user.entity';
import { MailService } from 'src/services/mail.service';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { IJwtPayload } from 'src/types/auth.type';
import * as randomCodeUtil from 'src/utils/random-code.util';
import { MockServiceFactory } from './mocks/unit-mock-factory';
import { AccountService } from 'src/account/account.service';
import { SocialLoginStatus, SocialProvider } from 'src/const/auth.const';

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
  let redisCachingService: RedisCachingService;
  let mailService: MailService;
  let accountService: AccountService;

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
          provide: RedisCachingService,
          useValue: MockServiceFactory.createMockService(RedisCachingService),
        },
        {
          provide: MailService,
          useValue: MockServiceFactory.createMockService(MailService),
        },
        {
          provide: AccountService,
          useValue: MockServiceFactory.createMockService(AccountService),
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    redisCachingService = moduleRef.get(RedisCachingService);
    mailService = moduleRef.get(MailService);
    accountService = moduleRef.get(AccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('loginLocalUser', () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      nickname: 'tester',
    };
    const mockLoginDto: LoginLocalUserDto = {
      email: mockUser.email,
      password: '12345',
    };

    it('로그인이 되면 user 객체를 반환', async () => {
      jest.spyOn(accountService, 'getUser').mockResolvedValue(mockUser as User);
      jest.spyOn(accountService, 'verifyLocalAuth').mockResolvedValue(true);

      const result = await authService.loginLocalUser(mockLoginDto);

      expect(result).toEqual({ user: mockUser });
      expect(accountService.getUser).toHaveBeenCalledWith(
        { email: mockLoginDto.email },
        { support_team: true },
      );
      expect(accountService.verifyLocalAuth).toHaveBeenCalledWith(
        mockUser.id,
        mockLoginDto.password,
      );
    });

    it('해당 유저가 없는 경우, UnauthorizedException 예외 발생', async () => {
      jest.spyOn(accountService, 'getUser').mockResolvedValue(null);
      jest.spyOn(accountService, 'verifyLocalAuth');

      await expect(authService.loginLocalUser(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(accountService.verifyLocalAuth).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀린 경우, UnauthorizedException 예외 발생', async () => {
      jest.spyOn(accountService, 'getUser').mockResolvedValue(mockUser as User);
      jest.spyOn(accountService, 'verifyLocalAuth').mockResolvedValue(false);

      await expect(authService.loginLocalUser(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(accountService.verifyLocalAuth).toHaveBeenCalledWith(
        mockUser.id,
        mockLoginDto.password,
      );
    });
  });

  describe('loginSocialUser', () => {
    const sub = 'social123';
    const email = 'test@test.com';
    const provider = SocialProvider.GOOGLE;

    it('소셜 인증이 있는 경우 해당 유저와 성공 상태를 반환', async () => {
      const socialAuth = { user: mockUser };
      jest
        .spyOn(accountService, 'findSocialAuth')
        .mockResolvedValue(socialAuth as any);

      const result = await authService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.SUCCESS,
      });
      expect(accountService.findSocialAuth).toHaveBeenCalledWith(
        { sub, provider },
        { user: true },
        { user: { id: true, email: true } },
      );
    });

    it('소셜 인증이 없고 동일 이메일 유저가 있는 경우 중복 상태를 반환', async () => {
      jest.spyOn(accountService, 'findSocialAuth').mockResolvedValue(null);
      jest.spyOn(accountService, 'getUser').mockResolvedValue(mockUser as User);

      const result = await authService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.DUPLICATE,
      });
    });

    it('소셜 인증이 없고 동일 이메일 유저도 없는 경우 새 유저를 생성', async () => {
      jest.spyOn(accountService, 'findSocialAuth').mockResolvedValue(null);
      jest.spyOn(accountService, 'getUser').mockResolvedValue(null);
      jest
        .spyOn(accountService, 'createSocialUser')
        .mockResolvedValue(mockUser as User);

      const result = await authService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.SUCCESS,
      });
      expect(accountService.createSocialUser).toHaveBeenCalledWith(
        { email },
        { sub, provider },
      );
    });
  });

  describe('linkSocial', () => {
    it('accountService.createSocialAuth를 호출하고 결과를 반환', async () => {
      const data = {
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        user_id: 1,
      };
      jest.spyOn(accountService, 'createSocialAuth').mockResolvedValue(true);

      const result = await authService.linkSocial(data);

      expect(result).toBe(true);
      expect(accountService.createSocialAuth).toHaveBeenCalledWith(data);
    });
  });

  describe('makeCodeAndSendMail', () => {
    it('인증 코드를 생성하고 이메일 전송 후 캐싱', async () => {
      const email = 'test@test.com';
      jest.spyOn(randomCodeUtil, 'createRandomCode').mockReturnValue('12345');
      jest.spyOn(mailService, 'sendAuthCodeMail').mockResolvedValue(true);
      jest
        .spyOn(redisCachingService, 'cachingVerificationCode')
        .mockResolvedValue(undefined);

      const result = await authService.makeCodeAndSendMail(email);

      expect(result).toBe(true);
      expect(mailService.sendAuthCodeMail).toHaveBeenCalledWith(email, '12345');
      expect(redisCachingService.cachingVerificationCode).toHaveBeenCalledWith(
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
      expect(
        redisCachingService.cachingVerificationCode,
      ).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmailCode', () => {
    it('사용자가 입력한 이메일 코드가 올바르면 true 반환', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '12345',
        email: 'test@test.com',
      };

      jest
        .spyOn(redisCachingService, 'getCachedVerificationCode')
        .mockResolvedValue('12345');
      jest
        .spyOn(redisCachingService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      const result = await authService.verifyEmailCode(mockDto);

      expect(result).toEqual(true);
      expect(
        redisCachingService.getCachedVerificationCode,
      ).toHaveBeenCalledWith(mockDto.email);
      expect(redisCachingService.deleteVerificationCode).toHaveBeenCalledWith(
        mockDto.email,
      );
    });

    it('해당 이메일로 캐싱된 코드가 없는 경우, UnauthorizedException예외를 반환', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '54321',
        email: 'mock@test.com',
      };
      jest
        .spyOn(redisCachingService, 'getCachedVerificationCode')
        .mockResolvedValue(null);
      jest
        .spyOn(redisCachingService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      await expect(authService.verifyEmailCode(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(
        redisCachingService.getCachedVerificationCode,
      ).toHaveBeenCalledWith(mockDto.email);
      expect(redisCachingService.deleteVerificationCode).not.toHaveBeenCalled();
    });

    it('사용자가 입력한 코드가 캐싱되어 있는 코드와 다른 경우, UnauthorizedException예외를 발생', async () => {
      const mockDto: EmailWithCodeDto = {
        code: '54321',
        email: 'mock@test.com',
      };
      jest
        .spyOn(redisCachingService, 'getCachedVerificationCode')
        .mockResolvedValue('12345');
      jest
        .spyOn(redisCachingService, 'deleteVerificationCode')
        .mockResolvedValueOnce();

      await expect(authService.verifyEmailCode(mockDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(
        redisCachingService.getCachedVerificationCode,
      ).toHaveBeenCalledWith(mockDto.email);
      expect(redisCachingService.deleteVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('issueToken', () => {
    it('리프레시 토큰을 발급', async () => {
      const payload = { id: 1, email: 'test@test.com' };
      jest.spyOn(jwtService, 'sign').mockReturnValue('token');

      const result = authService.issueToken(payload, true);

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

      const result = authService.issueToken(payload, false);

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

  describe('verifyToken', () => {
    it('유효한 Refresh Token인 경우, 적절한 페이로드를 반환', async () => {
      const mockToken = 'mockToken';
      const mockPayload: IJwtPayload = {
        id: 1,
        email: 'test@test.com',
        type: 'rf',
      };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);
      const result = await authService.verifyToken(mockToken, true);

      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: mockConfigData.JWT_REFRESH_SECRET,
      });
    });

    it.each([
      ['리프레쉬', '다시 로그인 해주세요', true],
      ['액세스', '유효하지 않은 토큰', false],
    ])(
      `올바르지 않은 %s 토큰인 경우 UnauthorizedException 예외와 메세지 - %s 반환`,
      async (type, msg, isRefresh) => {
        const mockToken = 'mockToken';
        jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

        await expect(
          authService.verifyToken(mockToken, isRefresh),
        ).rejects.toThrow(new UnauthorizedException(msg));

        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: isRefresh
            ? mockConfigData.JWT_REFRESH_SECRET
            : mockConfigData.JWT_ACCESS_SECRET,
        });
      },
    );
  });

  describe('extractTokenFromHeader', () => {
    it('헤더의 형식이 잘못되었을 때 UnauthorizedException 예외 발생', () => {
      const mockHeader = 'bearer testheader isnot';
      expect(() => authService.extractTokenFromHeader(mockHeader)).toThrow(
        UnauthorizedException,
      );
    });
    it('헤더가 bearer로 시작하지 않으면 UnauthorizedException 예외 발생', () => {
      const mockHeader = 'Basic testheader';

      expect(() => authService.extractTokenFromHeader(mockHeader)).toThrow(
        UnauthorizedException,
      );
    });
    it('올바른 헤더인 경우 헤더의 접두사를 제외한 토큰만 반환', () => {
      const mockHeader = 'Bearer testHeader';
      const mockToken = mockHeader.split(' ')[1];
      const result = authService.extractTokenFromHeader(mockHeader);
      expect(result).toBe(mockToken);
    });
  });
});
