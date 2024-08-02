import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';

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

  @ManyToOne(() => Team, (team) => team.users)
  @JoinColumn({ name: 'team_id' })
  support_team: Team;
}
