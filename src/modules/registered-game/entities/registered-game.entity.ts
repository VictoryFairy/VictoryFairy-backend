import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { RegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';
import { Game } from '../../game/entities/game.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Unique(['game', 'user'])
export class RegisteredGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  image?: string;

  @Column()
  seat: string;

  @Column('text')
  review: string;

  @Column({ nullable: true })
  status?: RegisteredGameStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

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
