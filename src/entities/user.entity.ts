import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { RegisteredGame } from './registered-game.entity';
import { Rank } from './rank.entity';

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

  @Column({ default: 1000 })
  score: number;

  @OneToMany(() => Rank, (rank) => rank.id)
  rank: Rank[];

  @ManyToOne(() => Team, (team) => team.users, { cascade: true })
  @JoinColumn({ name: 'support_team_id' })
  support_team: Team;

  @OneToMany(() => RegisteredGame, (registeredGame) => registeredGame.user, {
    cascade: true,
  })
  registeredGames: RegisteredGame[];
}
