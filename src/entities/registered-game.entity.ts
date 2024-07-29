import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Game } from "./game.entity";
import { User } from "./user.entity";

@Entity()
export class RegisteredGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  image: string;

  @Column()
  seat: string;

  @Column('text')
  review: string;

  @ManyToOne(type => Game)
  game: Game;

  @ManyToOne(type => User)
  user: User;
}