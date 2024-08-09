import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Player } from './player.entity';

@Entity()
export class CheeringSong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @Column('text')
  lyrics: string;

  @Column()
  link: string;

  @ManyToOne(() => Team, (team) => team.cheeringSongs)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @OneToOne(() => Player, (player) => player.cheeringSong, { nullable: true })
  player?: Player;
}
