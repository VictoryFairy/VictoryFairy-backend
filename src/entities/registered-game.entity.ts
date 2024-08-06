import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from './user.entity';
import { Team } from './team.entity';

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

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date;

  @ManyToOne(() => Game, (game) => game.registeredGames)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @ManyToOne(() => User, (user) => user.registeredGames, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Team, (cheering_team) => cheering_team.registeredGames)
  @JoinColumn({ name: 'cheering_team_id' })
  cheering_team: Team;
}
