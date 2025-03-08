import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from 'src/account/account.service';
import { User } from 'src/entities/user.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateLocalUserDto, LoginLocalUserDto } from 'src/dtos/user.dto';
import {
  SocialLinkStatus,
  SocialLoginStatus,
  SocialProvider,
} from 'src/const/auth.const';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/services/user.service';
import { UserRedisService } from 'src/services/user-redis.service';
import { RankService } from 'src/services/rank.service';
import { TermRedisService } from 'src/services/term-redis.service';
import { TermService } from 'src/services/term.service';
import { MockServiceFactory } from './mocks/unit-mock-factory';

jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => ({}),
  runOnTransactionCommit: jest.fn((callback: () => Promise<void>) =>
    callback(),
  ),
}));

describe('AccountService', () => {
  let accountService: AccountService;
  let userService: UserService;
  let authService: AuthService;
  let termService: TermService;
  let rankService: RankService;
  let userRedisService: UserRedisService;
  let termRedisService: TermRedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: TermService,
          useValue: {
            ...MockServiceFactory.createMockService(TermService),
            getTermList: jest.fn().mockResolvedValue({
              required: [{ id: 'term1' }, { id: 'term2' }],
              optional: [],
            }),
            saveUserAgreedTerm: jest.fn().mockResolvedValue(undefined),
            getUserAgreedTerms: jest.fn().mockResolvedValue(['term1', 'term2']),
          },
        },
        {
          provide: RankService,
          useValue: {
            ...MockServiceFactory.createMockService(RankService),
            initialSave: jest.fn().mockResolvedValue(undefined),
            updateRedisRankings: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UserRedisService,
          useValue: {
            ...MockServiceFactory.createMockService(UserRedisService),
            saveUser: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UserService,
          useValue: {
            ...MockServiceFactory.createMockService(UserService),
            getUser: jest.fn(),
            saveUser: jest.fn(),
            isExistEmail: jest.fn(),
            isExistNickname: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            ...MockServiceFactory.createMockService(AuthService),
            verifyLocalAuth: jest.fn(),
            getSocialAuth: jest.fn(),
            createLocalAuth: jest.fn(),
            createSocialAuth: jest.fn(),
            changePassword: jest.fn(),
          },
        },
        {
          provide: TermRedisService,
          useValue: {
            ...MockServiceFactory.createMockService(TermRedisService),
            getTermList: jest.fn().mockResolvedValue({
              required: [{ id: 'term1' }, { id: 'term2' }],
              optional: [],
            }),
          },
        },
      ],
    }).compile();

    accountService = module.get<AccountService>(AccountService);
    userService = module.get<UserService>(UserService);
    authService = module.get<AuthService>(AuthService);
    termService = module.get<TermService>(TermService);
    rankService = module.get<RankService>(RankService);
    userRedisService = module.get<UserRedisService>(UserRedisService);
    termRedisService = module.get<TermRedisService>(TermRedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(accountService).toBeDefined();
  });

  describe('loginLocalUser', () => {
    it('로그인 성공 시 사용자 정보 반환', async () => {
      const dto: LoginLocalUserDto = {
        email: 'test@test.com',
        password: 'password123',
      };
      const mockUser = { id: 1, email: 'test@test.com' };

      jest.spyOn(userService, 'getUser').mockResolvedValue(mockUser as User);
      jest.spyOn(authService, 'verifyLocalAuth').mockResolvedValue(true);

      const result = await accountService.loginLocalUser(dto);

      expect(result).toEqual({ user: mockUser });
      expect(userService.getUser).toHaveBeenCalledWith(
        { email: dto.email },
        { support_team: true },
      );
      expect(authService.verifyLocalAuth).toHaveBeenCalledWith(
        mockUser.id,
        dto.password,
      );
    });

    it('사용자가 존재하지 않으면 UnauthorizedException 발생', async () => {
      const dto: LoginLocalUserDto = {
        email: 'nonexistent@test.com',
        password: 'password123',
      };

      jest.spyOn(userService, 'getUser').mockResolvedValue(null);

      await expect(accountService.loginLocalUser(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userService.getUser).toHaveBeenCalledWith(
        { email: dto.email },
        { support_team: true },
      );
    });

    it('비밀번호가 일치하지 않으면 UnauthorizedException 발생', async () => {
      const dto: LoginLocalUserDto = {
        email: 'test@test.com',
        password: 'wrong_password',
      };
      const mockUser = { id: 1, email: 'test@test.com' };

      jest.spyOn(userService, 'getUser').mockResolvedValue(mockUser as User);
      jest.spyOn(authService, 'verifyLocalAuth').mockResolvedValue(false);

      await expect(accountService.loginLocalUser(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.verifyLocalAuth).toHaveBeenCalledWith(
        mockUser.id,
        dto.password,
      );
    });
  });

  describe('loginSocialUser', () => {
    it('이미 소셜 연동된 유저가 로그인하면 성공', async () => {
      const sub = 'social123';
      const email = 'test@test.com';
      const provider = SocialProvider.GOOGLE;
      const mockUser = { id: 1, email };
      const mockSocialAuth = {
        sub,
        provider,
        user: mockUser,
      };

      jest
        .spyOn(authService, 'getSocialAuth')
        .mockResolvedValue(mockSocialAuth as SocialAuth);

      const result = await accountService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.LOGIN,
      });
      expect(authService.getSocialAuth).toHaveBeenCalledWith(
        { sub, provider },
        { user: true },
        { user: { id: true, email: true } },
      );
    });

    it('동일 이메일로 가입된 유저가 있으면 DUPLICATE 상태 반환', async () => {
      const sub = 'social123';
      const email = 'test@test.com';
      const provider = SocialProvider.GOOGLE;
      const mockUser = { id: 1, email };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(userService, 'getUser').mockResolvedValue(mockUser as User);

      const result = await accountService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.DUPLICATE,
      });
      expect(userService.getUser).toHaveBeenCalledWith(
        { email },
        {},
        { id: true, email: true },
      );
    });

    it('새로운 유저는 계정 생성 후 로그인 성공', async () => {
      const sub = 'social123';
      const email = 'new@test.com';
      const provider = SocialProvider.GOOGLE;
      const mockUser = { id: 1, email };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(userService, 'getUser').mockResolvedValue(null);
      jest
        .spyOn(accountService, 'createSocialUser')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockResolvedValue(undefined);

      const result = await accountService.loginSocialUser(sub, email, provider);

      expect(result).toEqual({
        user: mockUser,
        status: SocialLoginStatus.SIGNUP,
      });
      expect(accountService.createSocialUser).toHaveBeenCalledWith(
        { email },
        { sub, provider },
      );
      expect(userRedisService.saveUser).toHaveBeenCalledWith(mockUser);
      expect(rankService.updateRedisRankings).toHaveBeenCalledWith(
        result.user.id,
      );
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

      const { password, ...userData } = dto;

      jest
        .spyOn(userService, 'saveUser')
        .mockResolvedValue(createdUser as User);
      jest.spyOn(authService, 'createLocalAuth').mockResolvedValue(true);
      jest.spyOn(rankService, 'initialSave').mockResolvedValue(undefined);
      jest
        .spyOn(accountService, 'agreeUserRequireTerm')
        .mockResolvedValue(true);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockResolvedValue(undefined);

      const result = await accountService.createLocalUser(dto);

      expect(result).toEqual({ id: createdUser.id });
      expect(userService.saveUser).toHaveBeenCalledWith(userData);
      expect(authService.createLocalAuth).toHaveBeenCalledWith(
        createdUser.id,
        password,
      );
      expect(rankService.initialSave).toHaveBeenCalled();
      expect(accountService.agreeUserRequireTerm).toHaveBeenCalledWith(
        createdUser.id,
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
      };

      jest
        .spyOn(userService, 'saveUser')
        .mockResolvedValue(createdUser as User);
      jest
        .spyOn(accountService, 'agreeUserRequireTerm')
        .mockResolvedValue(true);
      jest.spyOn(authService, 'createSocialAuth').mockResolvedValue(true);

      const result = await accountService.createSocialUser(
        userData,
        socialAuthData,
      );

      expect(result).toEqual(createdUser);
      expect(userService.saveUser).toHaveBeenCalledWith(userData);
      expect(accountService.agreeUserRequireTerm).toHaveBeenCalledWith(
        createdUser.id,
      );
      expect(authService.createSocialAuth).toHaveBeenCalledWith(
        socialAuthData,
        createdUser.id,
      );
    });
  });

  describe('linkSocial', () => {
    it('소셜 계정 연결 성공', async () => {
      const data = {
        user_id: 1,
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
      };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(authService, 'createSocialAuth').mockResolvedValue(true);

      const result = await accountService.linkSocial(data);

      expect(result).toEqual({ status: SocialLinkStatus.SUCCESS });
      expect(authService.getSocialAuth).toHaveBeenCalledWith({
        sub: data.sub,
        provider: data.provider,
        user_id: data.user_id,
      });
      expect(authService.createSocialAuth).toHaveBeenCalledWith(
        data,
        data.user_id,
      );
    });

    it('이미 연결된 소셜 계정이면 DUPLICATE 상태 반환', async () => {
      const data = {
        user_id: 1,
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
      };
      const mockSocialAuth = { ...data } as SocialAuth;

      jest
        .spyOn(authService, 'getSocialAuth')
        .mockResolvedValue(mockSocialAuth);

      const result = await accountService.linkSocial(data);

      expect(result).toEqual({ status: SocialLoginStatus.DUPLICATE });
      expect(authService.createSocialAuth).not.toHaveBeenCalled();
    });
  });

  describe('agreeUserRequireTerm', () => {
    it('필수 약관 동의 성공', async () => {
      const userId = 1;
      const mockRequiredTerms = [{ id: 'term1' }, { id: 'term2' }];

      jest.spyOn(termService, 'getTermList').mockResolvedValue({
        required: mockRequiredTerms,
        optional: [],
      });
      jest
        .spyOn(termService, 'saveUserAgreedTerm')
        .mockResolvedValue(undefined);

      const result = await accountService.agreeUserRequireTerm(userId);

      expect(result).toBe(true);
      expect(termService.getTermList).toHaveBeenCalled();
      expect(termService.saveUserAgreedTerm).toHaveBeenCalledWith(
        userId,
        mockRequiredTerms.map((term) => term.id),
      );
    });

    it('약관 동의 실패 시 InternalServerErrorException 발생', async () => {
      const userId = 1;

      jest
        .spyOn(termService, 'getTermList')
        .mockRejectedValue(new Error('약관 조회 실패'));

      await expect(accountService.agreeUserRequireTerm(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('checkUserAgreedRequiredTerm', () => {
    it('동의하지 않은 필수 약관 목록 반환', async () => {
      const userId = 1;
      const requiredTerms = [{ id: 'term1' }, { id: 'term2' }, { id: 'term3' }];
      const agreedTermIds = ['term1', 'term2'];

      jest.spyOn(termRedisService, 'getTermList').mockResolvedValue({
        required: requiredTerms,
        optional: [],
      });
      jest
        .spyOn(termService, 'getUserAgreedTerms')
        .mockResolvedValue(agreedTermIds);

      const result = await accountService.checkUserAgreedRequiredTerm(userId);

      expect(result).toEqual({ notAgreedRequiredTerms: ['term3'] });
      expect(termRedisService.getTermList).toHaveBeenCalled();
      expect(termService.getUserAgreedTerms).toHaveBeenCalledWith(userId);
    });

    it('모든 필수 약관에 동의한 경우 빈 배열 반환', async () => {
      const userId = 1;
      const requiredTerms = [{ id: 'term1' }, { id: 'term2' }];
      const agreedTermIds = ['term1', 'term2'];

      jest.spyOn(termRedisService, 'getTermList').mockResolvedValue({
        required: requiredTerms,
        optional: [],
      });
      jest
        .spyOn(termService, 'getUserAgreedTerms')
        .mockResolvedValue(agreedTermIds);

      const result = await accountService.checkUserAgreedRequiredTerm(userId);

      expect(result).toEqual({ notAgreedRequiredTerms: [] });
    });
  });

  describe('changePassword', () => {
    it('비밀번호 변경 성공', async () => {
      const email = 'test@test.com';
      const password = 'newpassword';
      const user = { id: 1, email };

      jest.spyOn(userService, 'getUser').mockResolvedValue(user as User);
      jest.spyOn(authService, 'changePassword').mockResolvedValue(true);

      await accountService.changePassword(email, password);

      expect(userService.getUser).toHaveBeenCalledWith({ email });
      expect(authService.changePassword).toHaveBeenCalledWith(
        user.id,
        password,
      );
    });

    it('유저가 존재하지 않으면 BadRequestException 발생', async () => {
      const email = 'nonexistent@test.com';
      const password = 'newpassword';

      jest.spyOn(userService, 'getUser').mockResolvedValue(null);

      await expect(
        accountService.changePassword(email, password),
      ).rejects.toThrow(BadRequestException);
      expect(userService.getUser).toHaveBeenCalledWith({ email });
    });

    it('비밀번호 업데이트 실패 시 InternalServerErrorException 발생', async () => {
      const email = 'test@test.com';
      const password = 'newpassword';
      const user = { id: 1, email };

      jest.spyOn(userService, 'getUser').mockResolvedValue(user as User);
      jest
        .spyOn(authService, 'changePassword')
        .mockRejectedValue(new Error('업데이트 실패'));

      await expect(
        accountService.changePassword(email, password),
      ).rejects.toThrow(InternalServerErrorException);
      expect(authService.changePassword).toHaveBeenCalledWith(
        user.id,
        password,
      );
    });
  });
});
