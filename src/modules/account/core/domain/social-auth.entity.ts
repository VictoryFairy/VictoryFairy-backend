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
import { CreateSocialAuthDto } from 'src/modules/auth/dto/internal/social-auth/create-social-auth.dto';
import { BadRequestException } from '@nestjs/common';

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

  static create(props: CreateSocialAuthDto): SocialAuth {
    if (
      !props.providerEmail ||
      !props.sub ||
      !props.provider ||
      !props.isPrimary
    ) {
      throw new BadRequestException('SocialAuth create error');
    }
    if (!Object.values(SocialProvider).includes(props.provider)) {
      throw new BadRequestException('소셜 로그인 제공하는 플랫폼이 아닙니다.');
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
