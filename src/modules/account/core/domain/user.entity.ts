import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rank } from 'src/modules/rank/core/domain/rank.entity';
import { Team } from '../../../team/core/domain/team.entity';
import { RegisteredGame } from 'src/modules/registered-game/core/domain/registered-game.entity';
import { LikeCheeringSong } from 'src/modules/cheering-song/core/domain/like-cheering-song.entity';
import { LocalAuth } from './local-auth.entity';
import { SocialAuth } from './social-auth.entity';
import { DEFAULT_PROFILE_IMAGE } from 'src/modules/account/core/const/user.const';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { BadRequestException } from '@nestjs/common';
import { UserTerm } from './user-term.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profile_image: string;

  @Column({ unique: true })
  nickname: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Rank, (rank) => rank.id)
  rank: Rank[];

  @ManyToOne(() => Team, (team) => team.users)
  @JoinColumn({ name: 'support_team_id' })
  support_team: Team;

  @OneToMany(() => RegisteredGame, (registeredGame) => registeredGame.user)
  registeredGames: RegisteredGame[];

  @OneToMany(() => LikeCheeringSong, (like) => like.user)
  likeCheeringSongs: LikeCheeringSong[];

  @OneToMany(() => UserTerm, (userTerm) => userTerm.user, {
    cascade: ['insert', 'update', 'remove'],
  })
  user_terms: UserTerm[];

  @OneToOne(() => LocalAuth, (localAuth) => localAuth.user, {
    nullable: true,
    cascade: ['insert', 'update', 'remove'],
  })
  local_auth: LocalAuth | null;

  @OneToMany(() => SocialAuth, (socialAuth) => socialAuth.user, {
    cascade: ['insert', 'update', 'remove'],
  })
  social_auths: SocialAuth[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  private constructor() {}

  public static async createWithLocalAuth(props: {
    email: string;
    image: string;
    nickname: string;
    teamId: number;
    password: string;
    termIds: string[];
  }): Promise<User> {
    const user = new User();
    if (!props.image || props.image.trim() === '') {
      props.image = DEFAULT_PROFILE_IMAGE;
    }
    if (!props.teamId || props.teamId === 0) {
      props.teamId = 1;
    }
    user.email = props.email;
    user.profile_image = props.image;
    user.nickname = props.nickname;
    user.support_team = { id: props.teamId } as Team;
    await user.createLocalAuth({ password: props.password });
    user.agreeTerms(props.termIds);
    return user;
  }

  public static async createWithSocialAuth(props: {
    email: string;
    image: string;
    nickname: string;
    teamId: number | null;
    socialAuthData: {
      sub: string;
      provider: SocialProvider;
      providerEmail: string;
      isPrimary: boolean;
    };
    termIds: string[];
  }): Promise<User> {
    const user = new User();
    if (!props.image || props.image.trim() === '') {
      props.image = DEFAULT_PROFILE_IMAGE;
    }
    if (!props.teamId || props.teamId === 0) {
      props.teamId = 1;
    }
    user.email = props.email;
    user.profile_image = props.image;
    user.nickname = props.nickname;
    user.support_team = { id: props.teamId } as Team;
    user.addSocialAuth({
      ...props.socialAuthData,
      userId: user.id,
    });
    user.agreeTerms(props.termIds);
    return user;
  }

  public static generateRandomNickname(): string {
    const randomNum = Math.floor(Math.random() * 10000);
    const nickname = `승리요정#${randomNum.toString().padStart(4, '0')}`;
    return nickname;
  }

  public async changePassword(newPassword: string) {
    if (!this.local_auth) {
      throw new BadRequestException('로컬 계정이 아닙니다.');
    }
    await this.local_auth.changePassword(newPassword);
  }

  public async validatePassword(inputPassword: string): Promise<boolean> {
    if (!this.local_auth) {
      throw new BadRequestException('로컬 계정이 아닙니다.');
    }
    return this.local_auth.validatePassword(inputPassword);
  }

  public agreeTerms(termIds: string[]): void {
    if (!termIds.length) return;
    if (!this.user_terms?.length) {
      this.user_terms = [];
    }

    const alreadyAgreedTermIdsSet = new Set(
      this.user_terms.map((term) => term.term_id),
    );

    termIds.forEach((termId) => {
      if (!alreadyAgreedTermIdsSet.has(termId)) {
        this.user_terms.push(UserTerm.create(termId));
      }
    });
  }

  public addSocialAuth(props: {
    sub: string;
    provider: SocialProvider;
    userId: number;
    providerEmail: string;
    isPrimary: boolean;
  }): void {
    if (
      this.social_auths.find(
        (auth) => auth.provider === props.provider && auth.sub === props.sub,
      )
    ) {
      throw new BadRequestException('이미 연동된 계정입니다.');
    }
    const socialAuth = SocialAuth.create(props);
    if (!this.social_auths.length) {
      this.social_auths = [socialAuth];
      return;
    }
    this.social_auths.push(socialAuth);
  }

  public removeSocialAuth(props: { provider: SocialProvider }): void {
    // 소셜 계정 연동 내역이 없는 경우
    if (!this.social_auths.length)
      throw new BadRequestException('소셜 계정 연동 내역이 없습니다.');

    const targetSocialAuth = this.social_auths.find((socialAuth) => {
      socialAuth.provider === props.provider;
    });

    // 해당 플랫폼으로 연동된 계정이 없는 경우
    if (!targetSocialAuth) {
      throw new BadRequestException('해당 플랫폼으로 연동된 계정이 없습니다.');
    }
    // 첫 가입 플랫폼은 연동 해제 불가능
    if (targetSocialAuth.is_primary) {
      throw new BadRequestException('첫 가입 플랫폼은 연동 해제 불가능합니다.');
    }

    // 해당 플랫폼으로 연동된 계정 제거
    const socialAuth = this.social_auths.filter(
      (socialAuth) => socialAuth.provider !== props.provider,
    );
    this.social_auths = socialAuth;
  }

  private async createLocalAuth(props: { password: string }): Promise<void> {
    if (this.local_auth) {
      throw new BadRequestException('해당 아이디는 이미 가입되어 있습니다.');
    }
    const localAuth = await LocalAuth.create(props.password);
    this.local_auth = localAuth;
  }

  public updateTeam(teamId: number): void {
    if (!teamId || teamId <= 0 || teamId > 10) {
      throw new BadRequestException('유효하지 않은 팀 ID입니다.');
    }
    this.support_team = { id: teamId } as Team;
  }

  public updateNickname(nickname: string): void {
    if (!nickname || nickname.trim() === '') {
      throw new BadRequestException('닉네임이 비어있습니다.');
    }
    this.nickname = nickname;
  }

  public updateProfileImage(imageUrl: string): void {
    if (!imageUrl || imageUrl.trim() === '') {
      throw new BadRequestException('업데이트할 프로필 이미지가 비어있습니다.');
    }
    this.profile_image = imageUrl;
  }
}
