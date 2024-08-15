import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { CheeringSong } from './cheering-song.entity';

@Entity()
@Unique(['name', 'jersey_number'])
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

  @OneToMany(() => CheeringSong, (cheeringSong) => cheeringSong.player)
  cheeringSongs: CheeringSong[];
}
