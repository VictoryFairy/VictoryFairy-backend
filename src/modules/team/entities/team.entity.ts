import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RegisteredGame } from '../../registered-game/entities/registered-game.entity';
import { Player } from '../../cheering-song/entities/player.entity';
import { User } from '../../user/entities/user.entity';
import { CheeringSong } from '../../cheering-song/entities/cheering-song.entity';

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
