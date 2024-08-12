import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { Player } from './player.entity';

@Entity()
@Unique(['link'])
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

  @ManyToOne(() => Player, (player) => player.cheeringSongs, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player?: Player;
}
