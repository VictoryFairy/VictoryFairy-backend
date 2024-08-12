import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { RegisteredGame } from './registered-game.entity';
import { CheeringSong } from './cheering-song.entity';
import { Player } from './player.entity';

@Entity()
@Unique(['name'])
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.support_team)
  users: User[];

  @OneToMany(
    () => RegisteredGame,
    (registeredGame) => registeredGame.cheering_team,
  )
  registeredGames: RegisteredGame[];

  @OneToMany(() => CheeringSong, (cheeringSong) => cheeringSong.team)
  cheeringSongs: CheeringSong[];

  @OneToMany(() => Player, (player) => player.team)
  players: Player[];
}
