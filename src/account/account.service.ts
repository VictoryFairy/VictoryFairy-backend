import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { User } from 'src/entities/user.entity';
import { LocalAuth } from 'src/entities/local-auth.entity';
import { SocialAuth } from 'src/entities/social-auth.entity';
import * as bcrypt from 'bcrypt';
import { DEFAULT_PROFILE_IMAGE, HASH_ROUND } from 'src/const/user.const';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IOAuthStateCachingData } from 'src/types/auth.type';
import { CreateLocalUserDto } from 'src/dtos/user.dto';
import { CreateSocialAuthDto, CreateUserDto } from 'src/dtos/account.dto';
import { RedisCachingService } from 'src/services/redis-caching.service';
import { v7 as uuidv7 } from 'uuid';
import { SocialProvider } from 'src/const/auth.const';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LocalAuth)
    private readonly localAuthRepository: Repository<LocalAuth>,
    @InjectRepository(SocialAuth)
    private readonly socialAuthRepository: Repository<SocialAuth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisCachingService: RedisCachingService,
  ) {}

  async getUser(
    where: FindOptionsWhere<User>,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where,
      relations,
      select,
    });
    return user;
  }

  async verifyLocalAuth(userId: number, password: string): Promise<boolean> {
    const localAuth = await this.localAuthRepository.findOne({
      where: { user_id: userId },
    });
    return bcrypt.compare(password, localAuth.password);
  }

  async findSocialAuth(
    where: FindOptionsWhere<SocialAuth>,
    relations?: FindOptionsRelations<SocialAuth>,
    select?: FindOptionsSelect<SocialAuth>,
  ): Promise<SocialAuth | null> {
    const found = await this.socialAuthRepository.findOne({
      where,
      relations,
      select,
    });

    return found;
  }

  async isExistEmail(email: string): Promise<boolean> {
    try {
      return this.userRepository.exists({ where: { email } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async isExistNickname(nickname: string): Promise<boolean> {
    try {
      return this.userRepository.exists({ where: { nickname } });
    } catch (error) {
      throw new InternalServerErrorException('DB 조회 실패');
    }
  }

  async createLocalUser(dto: CreateLocalUserDto): Promise<User> {
    const { email, image, nickname, password, teamId } = dto;
    const createdUser = await this.createUser({
      email,
      image,
      nickname,
      teamId,
    });
    await this.createLocalAuth(createdUser.id, password);

    return createdUser;
  }

  async createSocialUser(
    userData: CreateUserDto,
    socialAuthData: Omit<CreateSocialAuthDto, 'user_id'>,
  ) {
    const user = await this.createUser(userData);
    await this.createSocialAuth({ ...socialAuthData, user_id: user.id });
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const image = dto.image?.trim() ? dto.image : DEFAULT_PROFILE_IMAGE;
    const teamId = dto.teamId ?? 1;
    const nickname = dto.nickname?.trim()
      ? dto.nickname
      : await this.generateRandomNickname();

    await this.userRepository.insert({
      email: dto.email,
      profile_image: image,
      support_team: { id: teamId },
      nickname,
    });

    const createdUser = await this.getUser(
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
    return createdUser;
  }

  async createLocalAuth(userId: number, password: string): Promise<boolean> {
    try {
      const hashPw = await bcrypt.hash(password, HASH_ROUND);

      await this.localAuthRepository.insert({
        user_id: userId,
        password: hashPw,
      });
      return true;
    } catch (error) {
      throw new InternalServerErrorException('LocalAuth 생성 실패');
    }
  }

  /** @returns 정상가입 - true | 소셜로그인 없으나 기존 이메일 있는 경우 - false | 그 외 DB저장 실패 - Throw Error */
  async createSocialAuth(data: CreateSocialAuthDto): Promise<boolean> {
    const { sub, provider, user_id } = data;
    try {
      await this.socialAuthRepository.insert({
        sub,
        provider,
        user_id: user_id,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException('소셜 유저 생성 실패');
    }
  }

  async changePassword(email: string, password: string): Promise<void> {
    const user = await this.getUser({ email });
    if (!user) {
      throw new BadRequestException('해당 이메일로 가입된 계정 없음');
    }
    try {
      const newHashPw = await bcrypt.hash(password, HASH_ROUND);
      await this.localAuthRepository.update(
        { user_id: user.id },
        { password: newHashPw },
      );
    } catch (error) {
      throw new InternalServerErrorException('비밀번호 업데이트 실패');
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      await this.userRepository.delete(userId);
    } catch (error) {
      throw new InternalServerErrorException('유저 삭제 실패');
    }
  }

  async updateUser(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('유저 정보 업데이트 실패');
    }
  }

  extractTokenFromHeader(authHeader: string): string {
    const splitToken = authHeader.split(' ');
    if (splitToken.length !== 2 || splitToken[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('잘못된 토큰');
    }
    return splitToken[1];
  }

  async verifyToken(token: string, isRefresh: boolean): Promise<IJwtPayload> {
    const rfKey = this.configService.get<string>('JWT_REFRESH_SECRET');
    const acKey = this.configService.get<string>('JWT_ACCESS_SECRET');
    const secretKey = isRefresh ? rfKey : acKey;
    try {
      const result: IJwtPayload = await this.jwtService.verifyAsync(token, {
        secret: secretKey,
      });
      return result;
    } catch (error) {
      if (isRefresh) {
        throw new UnauthorizedException('다시 로그인 해주세요');
      } else {
        throw new UnauthorizedException('유효하지 않은 토큰');
      }
    }
  }

  private async generateRandomNickname(): Promise<string> {
    while (true) {
      const randomNum = Math.floor(Math.random() * 10000);
      const nickname = `승리요정#${randomNum.toString().padStart(4, '0')}`;
      const exists = await this.isExistNickname(nickname);
      if (!exists) {
        return nickname;
      }
    }
  }

  async saveOAuthStateWithUser(data: {
    provider: SocialProvider;
    userId?: number;
  }): Promise<{ state: string }> {
    const state = uuidv7();
    await this.redisCachingService.saveOAuthState({ ...data, state });
    return { state };
  }

  async getOAuthStateData(state: string): Promise<IOAuthStateCachingData> {
    const data = await this.redisCachingService.getOAuthState(state);
    return data;
  }
}
