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
import { User } from 'src/modules/user/entities/user.entity';

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
}
