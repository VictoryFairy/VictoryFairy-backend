import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { User } from 'src/modules/account/core/domain/user.entity';
import {
  AccountInvalidSocialAuthDataError,
  AccountInvalidProviderError,
} from './error/account.error';

@Entity()
@Unique(['sub', 'provider']) // 복합 유니크 인덱스
export class SocialAuth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 15 })
  provider: SocialProvider;

  @Column()
  sub: string;

  @Index() // 인덱스 추가
  @Column()
  user_id: number;

  @Column({ type: 'varchar', length: 100 })
  provider_email: string;

  @Column({ default: false, nullable: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.social_auths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  private constructor() {}

  static create(props: {
    provider: SocialProvider;
    sub: string;
    providerEmail: string;
    userId: number;
    isPrimary: boolean;
  }): SocialAuth {
    if (
      !props.providerEmail ||
      !props.sub ||
      !props.provider ||
      !props.isPrimary
    ) {
      throw new AccountInvalidSocialAuthDataError();
    }
    if (!Object.values(SocialProvider).includes(props.provider)) {
      throw new AccountInvalidProviderError();
    }
    const socialAuth = new SocialAuth();
    socialAuth.provider = props.provider;
    socialAuth.sub = props.sub;
    socialAuth.provider_email = props.providerEmail;
    socialAuth.user_id = props.userId;
    socialAuth.is_primary = props.isPrimary;
    return socialAuth;
  }
}
