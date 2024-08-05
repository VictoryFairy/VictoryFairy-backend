import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { RegisteredGame } from './registered-game.entity';

@Entity()
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
}
