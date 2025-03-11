import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { SocialProvider } from 'src/const/auth.const';

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

  @ManyToOne(() => User, (user) => user.social_auths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
