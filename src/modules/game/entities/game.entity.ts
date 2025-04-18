import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { Stadium } from '../../stadium/entities/stadium.entity';
import { RegisteredGame } from '../../registered-game/entities/registered-game.entity';

@Entity()
@Unique(['date', 'time', 'stadium'])
export class Game {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  home_team_score?: number | null;

  @Column({ nullable: true })
  away_team_score?: number | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'home_team_id' })
  home_team: Team;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'away_team_id' })
  away_team: Team;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'winning_team_id' })
  winning_team?: Team | null;

  @ManyToOne(() => Stadium)
  @JoinColumn({ name: 'stadium_id' })
  stadium: Stadium;

  @OneToMany(() => RegisteredGame, (registeredGame) => registeredGame.game)
  registeredGames: RegisteredGame[];
}
