import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { EmailWithCodeDto, LoginUserDto } from 'src/dtos/user.dto';
import { User } from 'src/entities/user.entity';
import { MailService } from 'src/services/mail.service';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { IJwtPayload } from 'src/types/auth.type';
import * as randomCodeUtil from 'src/utils/random-code.util';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { MockRepoFactory, MockServiceFactory } from './mocks/unit-mock-factory';

const mockUser = {
  id: 1,
  email: 'test@test.com',
  nickname: 'tester',
  supported_team: { id: 1, name: 'team' },
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
  let mockUserRepo: Repository<User>;

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
          provide: getRepositoryToken(User),
          useValue: MockRepoFactory.createMockRepo<User>(),
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
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    redisCachingService = moduleRef.get(RedisCachingService);
    mailService = moduleRef.get(MailService);
    mockUserRepo = moduleRef.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });
  describe('loginUser', () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      nickname: 'tester',
      password: 'hashed_pw',
    };
    const mockLoginDto: LoginUserDto = {
      email: mockUser.email,
      password: '12345',
    };
    it('로그인이 되면 user, 리프레쉬 토큰, 엑세스 토큰을 반환', async () => {
      jest.spyOn(authService, 'getUser').mockResolvedValue(mockUser as User);
      const bcryptCompare = jest.fn().mockResolvedValue(true);
      (bcrypt.compare as jest.Mock) = bcryptCompare;
      jest
        .spyOn(authService, 'issueToken')
        .mockImplementation(({ id, email }, isRefresh) => {
          return isRefresh ? 'rfToken' : 'acToken';
        });

      const result = await authService.loginUser(mockLoginDto);

      expect(result).toEqual({
        user: mockUser,
        rfToken: 'rfToken',
        acToken: 'acToken',
      });
      expect(authService.getUser).toHaveBeenCalledWith(
        { email: mockLoginDto.email },
        { support_team: true },
      );
      expect(bcryptCompare).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password,
      );
      expect(authService.issueToken).toHaveBeenCalledTimes(2);
    });

    it('해당 유저가 없는 경우, UnauthorizedException 예외 발생', async () => {
      jest.spyOn(authService, 'getUser').mockResolvedValue(null);
      const bcryptCompare = jest.fn();
      (bcrypt.compare as jest.Mock) = bcryptCompare;
      jest.spyOn(authService, 'issueToken');

      await expect(authService.loginUser(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptCompare).not.toHaveBeenCalled();
      expect(authService.issueToken).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀린 경우, UnauthorizedException 예외 발생', async () => {
      jest.spyOn(authService, 'getUser').mockResolvedValue(mockUser as User);
      const bcryptCompare = jest.fn().mockResolvedValue(false);
      (bcrypt.compare as jest.Mock) = bcryptCompare;
      jest.spyOn(authService, 'issueToken');

      await expect(authService.loginUser(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptCompare).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password,
      );
      expect(authService.issueToken).not.toHaveBeenCalled();
    });
  });

  describe('makeCodeAndSendMail', () => {
    it('인증 코드를 해당 이메일 전송 실패한 경우, InternalServerErrorException 예외 발생', async () => {
      const email = 'test@test.com';
      jest
        .spyOn(redisCachingService, 'cachingVerificationCode')
        .mockResolvedValue(undefined);
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

  describe('getUser', () => {
    it('where과 relations이 적절히 호출되었는지 확인', async () => {
      const mockWhere = { email: 'test@test.com' };
      const mockRelations = { support_team: true };

      jest
        .spyOn(mockUserRepo, 'findOne')
        .mockResolvedValue(mockUser as unknown as User);

      const result = await authService.getUser(mockWhere, mockRelations);

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: mockWhere,
        relations: mockRelations,
      });
    });
    it('해당 유저가 없는 경우, UnauthorizedException 예외 발생 ', async () => {
      const mockWhere = { email: 'test@test.com' };
      const mockRelations = { support_team: true };

      jest.spyOn(mockUserRepo, 'findOne').mockResolvedValue(null);

      expect(authService.getUser(mockWhere, mockRelations)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
