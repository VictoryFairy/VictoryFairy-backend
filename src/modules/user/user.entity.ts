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
import { Team } from '../team/entities/team.entity';
import { RegisteredGame } from '../registered-game/entities/registered-game.entity';
import { LikeCheeringSong } from '../cheering-song/entities/like-cheering-song.entity';
import { UserTerm } from '../term/entities/user-term.entity';
import { LocalAuth } from '../auth/entities/local-auth.entity';
import { SocialAuth } from '../auth/entities/social-auth.entity';
import { Rank } from '../rank/entities/rank.entity';

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

  @OneToMany(() => UserTerm, (userTerm) => userTerm.user)
  user_terms: UserTerm[];

  @OneToOne(() => LocalAuth, (localAuth) => localAuth.user, { nullable: true })
  local_auth: LocalAuth | null;

  @OneToMany(() => SocialAuth, (socialAuth) => socialAuth.user)
  social_auths: SocialAuth[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
