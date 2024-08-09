import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { CheeringSong } from './cheering-song.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  jersey_number: number;

  @Column()
  position: string;

  @Column()
  throws_bats: string;

  @ManyToOne(() => Team, (team) => team.players)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @OneToOne(() => CheeringSong, (cheeringSong) => cheeringSong)
  @JoinColumn({ name: 'cheering_song_id' })
  cheeringSong: CheeringSong;
}
