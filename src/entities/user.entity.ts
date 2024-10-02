import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { RegisteredGame } from './registered-game.entity';
import { Rank } from './rank.entity';
import { LikeCheeringSong } from './like-cheering-song.entity';

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

  @Column()
  password: string;

  @OneToMany(() => Rank, (rank) => rank.id)
  rank: Rank[];

  @ManyToOne(() => Team, (team) => team.users)
  @JoinColumn({ name: 'support_team_id' })
  support_team: Team;

  @OneToMany(() => RegisteredGame, (registeredGame) => registeredGame.user)
  registeredGames: RegisteredGame[];

  @OneToMany(() => LikeCheeringSong, (like) => like.user)
  likeCheeringSongs: LikeCheeringSong[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
