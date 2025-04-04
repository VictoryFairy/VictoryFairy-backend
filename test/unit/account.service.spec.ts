import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from 'src/modules/account/account.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { UserRedisService } from 'src/core/redis/user-redis.service';
import { RankService } from 'src/modules/rank/rank.service';
import { TermRedisService } from 'src/core/redis/term-redis.service';
import { MockServiceFactory } from './mocks/unit-mock-factory';
import { UserService } from 'src/modules/user/user.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { TermService } from 'src/modules/term/term.service';
import {
  CreateLocalUserDto,
  LoginLocalUserDto,
} from 'src/modules/user/dto/user.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { SocialAuth } from 'src/modules/auth/entities/social-auth.entity';

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
    const mockSocialUserInfo = {
      sub: 'social123',
      email: 'test@test.com',
      provider: SocialProvider.GOOGLE,
    };

    it('이미 소셜 연동된 유저가 로그인하면 성공 (isNewUser: false)', async () => {
      const mockUser = {
        id: 1,
        email: mockSocialUserInfo.email,
        support_team: { id: 1, name: 'Team' },
      };
      const mockSocialAuth = { user_id: mockUser.id };

      jest
        .spyOn(authService, 'getSocialAuth')
        .mockResolvedValue(mockSocialAuth as SocialAuth);
      jest
        .spyOn(userService, 'getUserWithSupportTeamWithId')
        .mockResolvedValue(mockUser as any);

      const result = await accountService.loginSocialUser(
        mockSocialUserInfo.sub,
        mockSocialUserInfo.email,
        mockSocialUserInfo.provider,
      );

      expect(result).toEqual({
        user: mockUser,
        isNewUser: false,
      });
      expect(authService.getSocialAuth).toHaveBeenCalledWith(
        { sub: mockSocialUserInfo.sub, provider: mockSocialUserInfo.provider },
        {},
        { user_id: true },
      );
      expect(userService.getUserWithSupportTeamWithId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('동일 이메일로 가입된 유저가 있으면 ConflictException 발생', async () => {
      const mockUser = { id: 1, email: mockSocialUserInfo.email };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(userService, 'getUser').mockResolvedValue(mockUser as User);

      await expect(
        accountService.loginSocialUser(
          mockSocialUserInfo.sub,
          mockSocialUserInfo.email,
          mockSocialUserInfo.provider,
        ),
      ).rejects.toThrow(new ConflictException('이미 가입된 이메일입니다.'));

      expect(userService.getUser).toHaveBeenCalledWith(
        { email: mockSocialUserInfo.email },
        {},
        { id: true, email: true },
      );
    });

    it('새로운 유저는 계정 생성 후 로그인 성공 (isNewUser: true)', async () => {
      const mockCreatedUser = {
        id: 1,
        email: mockSocialUserInfo.email,
        support_team: { id: 1, name: 'Team' },
      };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(userService, 'getUser').mockResolvedValue(null);
      jest
        .spyOn(accountService, 'createSocialUser')
        .mockResolvedValue(mockCreatedUser as User);
      jest
        .spyOn(userService, 'getUserWithSupportTeamWithId')
        .mockResolvedValue(mockCreatedUser as any);
      jest.spyOn(userRedisService, 'saveUser').mockResolvedValue(undefined);
      jest
        .spyOn(rankService, 'updateRedisRankings')
        .mockResolvedValue(undefined);

      const result = await accountService.loginSocialUser(
        mockSocialUserInfo.sub,
        mockSocialUserInfo.email,
        mockSocialUserInfo.provider,
      );

      expect(result).toEqual({
        user: mockCreatedUser,
        isNewUser: true,
      });
      expect(accountService.createSocialUser).toHaveBeenCalledWith(
        { email: mockSocialUserInfo.email },
        {
          sub: mockSocialUserInfo.sub,
          provider: mockSocialUserInfo.provider,
          providerEmail: mockSocialUserInfo.email,
          isPrimary: true,
        },
      );
      expect(userRedisService.saveUser).toHaveBeenCalledWith(mockCreatedUser);
      expect(rankService.updateRedisRankings).toHaveBeenCalledWith(
        mockCreatedUser.id,
      );
    });

    it('소셜 로그인 처리 중 에러 발생시 InternalServerErrorException 발생', async () => {
      jest
        .spyOn(authService, 'getSocialAuth')
        .mockRejectedValue(new Error('DB Error'));

      await expect(
        accountService.loginSocialUser(
          mockSocialUserInfo.sub,
          mockSocialUserInfo.email,
          mockSocialUserInfo.provider,
        ),
      ).rejects.toThrow(new InternalServerErrorException('소셜 로그인 실패'));

      expect(authService.getSocialAuth).toHaveBeenCalled();
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
      jest
        .spyOn(rankService, 'insertRankIfAbsent')
        .mockResolvedValue(undefined);
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
      expect(rankService.insertRankIfAbsent).toHaveBeenCalled();
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
        providerEmail: 'test@gmail.com',
        isPrimary: true,
      };
      const createdUser = {
        id: 1,
        email: userData.email,
        support_team: { id: 1 },
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
        userId: 1,
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        providerEmail: 'test@gmail.com',
        isPrimary: true,
      };

      jest.spyOn(authService, 'getSocialAuth').mockResolvedValue(null);
      jest.spyOn(authService, 'createSocialAuth').mockResolvedValue(true);

      const result = await accountService.linkSocial(data);

      expect(result).toBeUndefined();
      expect(authService.getSocialAuth).toHaveBeenCalledWith({
        sub: data.sub,
        provider: data.provider,
      });
      expect(authService.createSocialAuth).toHaveBeenCalledWith(
        data,
        data.userId,
      );
    });

    it('이미 연결된 소셜 계정이면 ConflictException 발생 ', async () => {
      const data = {
        userId: 1,
        sub: 'social123',
        provider: SocialProvider.GOOGLE,
        providerEmail: 'test@gmail.com',
        isPrimary: false,
      };
      const mockSocialAuth = {
        sub: data.sub,
        provider: data.provider,
        provider_email: data.providerEmail,
        user_id: data.userId,
      } as SocialAuth;

      jest
        .spyOn(authService, 'getSocialAuth')
        .mockResolvedValue(mockSocialAuth);

      await expect(accountService.linkSocial(data)).rejects.toThrow(
        ConflictException,
      );
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
