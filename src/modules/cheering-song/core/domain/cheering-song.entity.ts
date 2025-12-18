import { Team } from '../../../team/core/domain/team.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Player } from './player.entity';
import { LikeCheeringSong } from './like-cheering-song.entity';

@Entity()
@Unique(['link'])
export class CheeringSong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

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

  @OneToMany(() => LikeCheeringSong, (like) => like.cheeringSong, {
    cascade: true,
  })
  likeCheeringSongs: LikeCheeringSong[];
}
